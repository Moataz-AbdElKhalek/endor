
import { validationResult } from 'express-validator/check';
import * as responseHelper from '../utils/response-helper';
import * as errorFormatter from '../utils/error-formatter';

let userService = {};
let githubCredentialsService = {};
let herokuCredentialsService = {};

/**
 * Handles the GET /users request
 *
 * Gets all users' information
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    res.send(users);
  } catch (error) {
    next(error);
  }
}

/**
 * Finds the user by user id or username and then gets the heroku email and github password if
 * needed
 * @param user the user id or username
 * @returns {Promise<*>} the user that was found
 */
async function getUser(user) {
  const userFound = await userService.getUserByIdOrUsername(user);
  userFound.dataValues.githubUsername =
    await githubCredentialsService.getGithubUsernameForUser(userFound.id);
  userFound.dataValues.herokuEmail =
    await herokuCredentialsService.getHerokuEmailForUser(userFound.id);

  return userFound;
}

/**
 * Handles the GET /users/:user request
 *
 * Gets the id or username from the URl and gets the users information
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function getUserByIdOrUsername(req, res, next) {
  try {
    const { user } = req.params;
    const userFound = await getUser(user);
    res.send(userFound);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles the GET /user request
 *
 * This will get the authenticated user and then get their information
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function getAuthenticatedUser(req, res, next) {
  try {
    const user = req.user.id;
    const userFound = await getUser(user);
    res.send(userFound);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles the POST /users request
 *
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function createUser(req, res, next) {
  const errors = validationResult(req).formatWith(errorFormatter.formatError);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = req.body;
    const { password } = user;
    delete user.password;
    const userCreated = await userService.createUser(user, password);

    res.status(201).send(userCreated);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle the PATCH /users/:user request
 *
 * @param req the request
 * @param res the response
 * @param next the next middleware
 */
export async function updateUserByIdOrUsername(req, res, next) {
  try {
    const userIdOrUsername = req.params.user;
    const user = req.body;
    const userUpdated = await userService.updateUser(userIdOrUsername, user);
    res.send(userUpdated);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle the DELETE /users/:user request
 *
 * @param req the request
 * @param res the response
 * @param next the next middlware
 */
export async function deleteUserById(req, res, next) {
  try {
    const { user } = req.params;
    await userService.deleteUserByIdOrUsername(user);
    responseHelper.noContent(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Sets the dependencies for the controller
 * @param newUserService the user service for the controller
 * @param newGithubCredentialsService the service to get github credentials for a user
 * @param newHerokuCredentialsService the service to get heroku credentials for a user
 */
export function setDependencies(
  newUserService,
  newGithubCredentialsService,
  newHerokuCredentialsService
) {
  userService = newUserService;
  githubCredentialsService = newGithubCredentialsService;
  herokuCredentialsService = newHerokuCredentialsService;
}
