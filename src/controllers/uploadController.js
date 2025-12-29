const uploadTasks = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the Word document
    const wordParser = require('../services/wordParser');
    const tasks = await wordParser.parseTasks(req.file.buffer);

    if (!tasks || tasks.length === 0) {
      return res.status(400).json({ error: 'No valid tasks found in document' });
    }

    // Validate tasks
    const validTasks = tasks.filter(task => task.title && task.description);

    if (validTasks.length === 0) {
      return res.status(400).json({ 
        error: 'No tasks with both title and description found' 
      });
    }

    // Create issues in GitHub
    const githubService = require('../services/githubService');
    const results = await githubService.createIssuesFromTasks(validTasks);

    res.status(201).json({
      message: `Successfully created ${results.length} task(s) in GitHub`,
      tasks: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadTasks,
};