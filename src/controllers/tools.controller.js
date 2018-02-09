let toolsService = {};

export async function getTools(req, res) {
  console.log('get tools');
  const tools = await toolsService.getTools();
  res.send(tools);
}

export async function getSourceControlTools(req, res, next) {
  try {
    res.send(await toolsService.getSourceControlTools());
  } catch (error) {
    next(error);
  }
}

export async function getCITools(req, res, next) {
  try {
    res.send(await toolsService.getCITools());
  } catch (error) {
    next(error);
  }
}

export async function getContainerizationTools(req, res, next) {
  try {
    res.send(await toolsService.getContainerizationTools());
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentTools(req, res, next) {
  try {
    res.send(await toolsService.getDeploymentTools());
  } catch (error) {
    next(error);
  }
}

export async function getWebTools(req, res, next) {
  try {
    res.send(await toolsService.getWebFrameworks());
  } catch (error) {
    next(error);
  }
}

export async function getTestTools(req, res, next) {
  try {
    res.send(await toolsService.getTestFrameworks());
  } catch (error) {
    next(error);
  }
}

export async function getDatabaseTools(req, res, next) {
  try {
    res.send(await toolsService.getDatabaseTools());
  } catch (error) {
    next(error);
  }
}

export async function setDependencies(newToolsService) {
  toolsService = newToolsService;
}