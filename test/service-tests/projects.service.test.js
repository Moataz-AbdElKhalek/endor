import { expect } from 'chai';
import sequelize from '../../src/db/sequelize';
import UserService from '../../src/services/users.service';
import { getMockLogger } from '../util/mockLogger';
import ProjectService from '../../src/services/projects.service';
import { populateAllTestData } from '../../src/db/import_test_data';
import GithubAuthenticationService from '../../src/services/githubauth.service';
import { getActiveLogger } from '../../src/utils/winston';
import TravisAuthenticationService from '../../src/services/travisauth.service';
import '../globalSetupTeardown.test';
import HerokuAuthService from '../../src/services/herokuauth.service';

const userService = new UserService(sequelize.User, sequelize.Credentials, getMockLogger());
const githubAuthService = new GithubAuthenticationService(sequelize.GithubToken, userService, getActiveLogger());
const travisAuthService = new TravisAuthenticationService(sequelize.TravisToken, userService, getActiveLogger());
const herokuAuthService = new HerokuAuthService(sequelize.HerokuToken, userService, getActiveLogger());
const projectService = new ProjectService(sequelize.Project, userService, githubAuthService, travisAuthService, herokuAuthService, getMockLogger());

describe('Testing Project Service', async () => {
  before(async () => {
    await populateAllTestData(true);
  });

  describe('get all projects', async () => {
    it('should get all projects from the database', async () => {
      const projects = await projectService.getAllProjects();
      expect(projects.length).to.equal(3);
      expect(Array.isArray(projects)).to.equal(true);
    });
  });

  describe('get a project by id', async () => {
    it('should get the project by id', async () => {
      const project = await projectService.getProjectById('b1');
      expect(project.projectName).to.equal('TMNT');
      expect(project.description).to.equal('You gotta know what a crumpet is to understand cricket!');
      expect(project.version).to.equal('1.2.3');
      expect(project.license).to.equal('MIT');
      expect(project.authors).to.equal('Casey Jones, Raphael');
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const project = await projectService.getProjectById('b10000');
        expect(project).to.equal('undefined');
      } catch (error) {
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('get contributors for a project', async () => {
    it('should get the contributors for a project', async () => {
      const contributors = await projectService.getContributorsByProjectId('b1');
      expect(contributors.length).to.equal(3);

      expect(contributors[0].id).to.equal('a1');
      expect(contributors[1].id).to.equal('a2');
      expect(contributors[2].id).to.equal('a3');
    });
  });

  describe('get owners for a project', async () => {
    it('should get the owners for a project', async () => {
      const owners = await projectService.getOwnersByProjectId('b1');

      expect(owners.length).to.equal(1);

      expect(owners[0].id).to.equal('a4');
      expect(owners[0].username).to.equal('johnnyb');
      expect(owners[0].email).to.equal('hammer.io.team@gmail.com');
      expect(owners[0].firstName).to.equal('Johnny');
      expect(owners[0].lastName).to.equal('Bravo');
    });
  });

  describe('get projects for a user', async () => {
    it('should get all projects for a user (contributed and owned)', async () => {
      const userProjects = await projectService.getProjectsByUser('a2');
      expect(Array.isArray(userProjects.owned)).to.equal(true);
      expect(userProjects.owned.length).to.equal(1);
      expect(userProjects.owned[0].projectName).to.equal('hammer-io');

      expect(Array.isArray(userProjects.contributed)).to.equal(true);
      expect(userProjects.contributed.length).to.equal(1);
      expect(userProjects.contributed[0].projectName).to.equal('TMNT');
    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      try {
        const projects = await projectService.getProjectsByUser('a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('check if user is an owner on a project', async () =>  {
    it('should return true if a user is an owner on a project', async () => {
      const isContributor = await projectService.checkIfUserIsOwnerOnProject('b1', 'a4');
      expect(isContributor).to.equal(true);
    });

    it('should return false if a user is not a contributor on a project', async () => {
      const isContributor = await projectService.checkIfUserIsOwnerOnProject('b1', 'a2');
      expect(isContributor).to.equal(false);
    });
  });

  describe('check if user is a contributor on a project', async () => {
    it('should return true if a user is a contributor on a project', async () => {
      const isContributor = await projectService.checkIfUserIsContributorOnProject('b1', 'a3');
      expect(isContributor).to.equal(true);
    });

    it('should return false if a user is not a contributor on a project', async () => {
      const isContributor = await projectService.checkIfUserIsContributorOnProject('b1', 'a4');
      expect(isContributor).to.equal(false);
    });
  });

  describe('create a new project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should create a new project and return the project created', async () => {
      const newProject = {
        projectName: 'hello world',
        description: 'good bye world',
        version: '1.2.3',
        license: 'MIT',
        author: 'Creator'
      };

      const project = await projectService.createProject(newProject, 'a1');
      expect(project.projectName).to.equal('hello world');
      expect(project.description).to.equal('good bye world');
      expect(project.version).to.equal('1.2.3');
      expect(project.license).to.equal('MIT');
      expect(project.authors).to.equal('Creator');

    });

    it('should create a new project and save it to the database', async () => {
      const newProject = {
        projectName: 'hello world',
        description: 'good bye world',
        version: '1.2.3',
        license: 'MIT',
        author: 'Creator'
      };

      // // double check to make sure that the project was created
      const project = await projectService.createProject(newProject, 'a1');
      expect(project.projectName).to.equal(newProject.projectName);
      expect(project.description).to.equal(newProject.description);
      expect(project.version).to.equal(newProject.version);
      expect(project.license).to.equal(newProject.license);

      const newId = project.id;

      // filter projects by the id to make sure it can be retrieved via mass retrieve
      const projects = await projectService.getAllProjects();
      const filteredProjects = projects.filter((p) => {
        return (p.id === newId);
      });

      expect(filteredProjects.length).to.equal(1);
    });

    it('should add the user as an owner to the project', async () => {
      const newProject = {
        projectName: 'hello world',
        description: 'good bye world',
        version: '1.2.3',
        license: 'MIT',
        author: 'Creator'
      };

      // double check to make sure that the project was created
      const project = await projectService.createProject(newProject, 'a1');
      expect(project.projectName).to.equal(newProject.projectName);
      expect(project.description).to.equal(newProject.description);
      expect(project.version).to.equal(newProject.version);
      expect(project.license).to.equal(newProject.license);

      const newId = project.id;

      const owners = await project.getOwners();
      expect(owners.length).to.equal(1);
      expect(owners[0].id).to.equal('a1');
      expect(owners[0].username).to.equal('BobSagat');

      const owned = await projectService.getProjectsByUser('a1');

      const filteredOwned = owned.owned.filter((p) => {
        return p.id === newId;
      });

      expect(filteredOwned.length).to.equal(1);
    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      const project = {
        projectName: 'hello world',
        description: 'good bye world',
        version: '1.2.3',
        license: 'MIT',
        author: 'Creator'
      };

      try {
        const projects = await projectService.createProject(project, 'a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('add a new contributor to a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should add a new contributor to a project', async () => {
      await projectService.addContributorToProject('b3', 'a2');

      const contributors = await projectService.getContributorsByProjectId('b1');
      const filteredContributors = contributors.filter((user) => {
        return user.id === 'a1';
      });

      const contributed = await projectService.getProjectsByUser('a1');
      const filteredContributed = contributed.contributed.filter((project) => {
        return project.id === 'b1';
      });

      expect(filteredContributors.length).to.equal(1);
      expect(filteredContributed.length).to.equal(1);
    });

    it('should return the contributors after the project addition', async () => {
      const contributors = await projectService.addContributorToProject('b3', 'a2');
      expect(Array.isArray(contributors)).to.equal(true);
      expect(contributors.length).to.equal(1);
    });

    it('should not duplicate the contributor if they have already been added', async () => {
      try {
        const contributors = await projectService.addContributorToProject('b1', 'a1');
      } catch (error) {
        expect(error.message).to.equal('BobSagat is already a contributor or owner on this' +
          ' project.');
        expect(error.type).to.equal('Duplicate');
        expect(error.status).to.equal(422);
      }
    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      try {
        const projects = await projectService.addContributorToProject('b1', 'a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const projects = await projectService.addContributorToProject('b10000', 'a1');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('add a new owner to a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should add a new owner to a project', async () => {
      await projectService.addOwnerToProject('b3', 'a1');

      const owners = await projectService.getOwnersByProjectId('b3');
      const filteredOwners = owners.filter((user) => {
        return user.id === 'a1';
      });

      const owned = await projectService.getProjectsByUser('a1');
      const filteredOwned = owned.owned.filter((project) => {
        return project.id === 'b3';
      });

      expect(filteredOwners.length).to.equal(1);
      expect(filteredOwned.length).to.equal(1);
    });

    it('should return the contributors after the new addition', async () => {
      const owners = await projectService.addOwnerToProject('b3', 'a1');
      expect(Array.isArray(owners)).to.equal(true);
      expect(owners.length).to.equal(2);
    });

    it('should not duplicate the owner if they have already been added', async () => {
      let owners = [];
      try {
         owners = await projectService.addOwnerToProject('b1', 'a1');
      } catch (error) {
        expect(error.message).to.equal('BobSagat is already a contributor or owner on this' +
          ' project.');
        expect(error.type).to.equal('Duplicate');
        expect(error.status).to.equal(422);
      }

    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      try {
        const projects = await projectService.addOwnerToProject('b1', 'a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const projects = await projectService.addOwnerToProject('b10000', 'a1');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('update a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should update the project details', async () => {
      const newProject = {
        projectName: 'updated TMNT',
        description: 'updated You gotta know what a crumpet is to understand cricket!',
        version: '1.2.3',
        license: 'MIT',
        authors: 'Creator'
      };

      const project = await projectService.updateProject(newProject, 'b1');
      expect(project.projectName).to.equal('updated TMNT');
      expect(project.description).to.equal('updated You gotta know what a crumpet is to understand cricket!');
      expect(project.version).to.equal('1.2.3');
      expect(project.license).to.equal('MIT');
      expect(project.authors).to.equal('Creator');
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      const newProject = {
        projectName: 'updated TMNT',
        description: 'updated You gotta know what a crumpet is to understand cricket!',
        version: '1.2.3',
        license: 'MIT',
        authors: 'Creator'
      };

      try {
        const projects = await projectService.updateProject(newProject, 'b10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('delete a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should delete a project from the database', async () => {
      await projectService.deleteProjectById('b1', false);
      const projects = await projectService.getAllProjects();
      expect(projects.length).to.equal(2);
    });

    it('should return the deleted project', async () => {
      const project = await projectService.deleteProjectById('b1', false);
      expect(project.projectName).to.equal('TMNT');
      expect(project.description).to.equal('You gotta know what a crumpet is to understand cricket!');
      expect(project.version).to.equal('1.2.3');
      expect(project.license).to.equal('MIT');
      expect(project.authors).to.equal('Casey Jones, Raphael');    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const projects = await projectService.deleteProjectById('b10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('delete a contributor from a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should delete a contributor from a project', async () => {
      await projectService.deleteContributorFromProject('b1', 'a3');
      const contributors = await projectService.getContributorsByProjectId('b1');
      expect(contributors.length).to.equal(2);
    });

    it('should return the contributors after deletion', async () => {
      const contributors = await projectService.deleteContributorFromProject('b1', 'a3');
      expect(Array.isArray(contributors)).to.equal(true);
      expect(contributors.length).to.equal(2);
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const projects = await projectService.deleteContributorFromProject('b10000', 'a1');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      try {
        const projects = await projectService.deleteContributorFromProject('b1', 'a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });

  describe('delete an owner from a project', async () => {
    beforeEach(async () => {
      await populateAllTestData(true);
    });

    it('should delete an owner from a project', async () => {
        await projectService.addOwnerToProject('b1', 'a5')
        await projectService.deleteOwnerFromProject('b1', 'a4');
        const owners = await projectService.getOwnersByProjectId('b1');
        expect(owners.length).to.equal(1);
    });

    it('should throw an error if the owner being deleted is the last owner', async () => {
      try {
        await projectService.deleteOwnerFromProject('b1', 'a4');
        const owners = await projectService.getOwnersByProjectId('b1');
        expect(owners).to.equal('undefined');
      } catch (error) {
        expect(error.message).to.equal('Cannot delete the last owner for a project.');
        expect(error.status).to.equal(422);
      }
    });

    it('should return the owners after deletion', async () => {
      await projectService.addOwnerToProject('b1', 'a5')
      const owners = await projectService.deleteOwnerFromProject('b1', 'a4');
      expect(Array.isArray(owners)).to.equal(true);
      expect(owners.length).to.equal(1);
    });

    it('should throw a ProjectNotFoundException if the project does not exist', async () => {
      try {
        const projects = await projectService.deleteOwnerFromProject('b10000', 'a1');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('Project with id b10000 not found');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });

    it('should throw a UserNotFoundException if the user does not exist', async () => {
      try {
        await projectService.addOwnerToProject('b1', 'a5')
        const projects = await projectService.deleteOwnerFromProject('b1', 'a10000');
        expect(projects).to.equal('undefined');
      } catch (error) {
        expect(error).to.be.a('object');
        expect(error.message).to.equal('User with a10000 could not be found.');
        expect(error.type).to.equal('Not Found');
        expect(error.status).to.equal(404);
      }
    });
  });
});