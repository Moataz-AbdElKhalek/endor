let projectService = {};

/**
 * Handles the /projects/:id/contributors endpoint
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function getContributorsByProjectId(req, res, next) {
  try {
    const projectId = req.params.id;
    const contributors = await projectService.getContributorsByProjectId(projectId);
    res.send(contributors);
  } catch (error) {
    next(error);
  }
}

/**
 * Sets the project service for the controller
 * @param newProjectService the new project service
 */
export function setProjectService(newProjectService) {
  projectService = newProjectService;
}