const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');

/**
 * Extract tasks from mammoth-parsed text
 * Supports multiple formats: numbered lists, bullet points, and dash-separated items
 * @param {string} text - The extracted text from the Word document
 * @returns {Array<string>} Array of extracted tasks
 */
function extractTasksFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const tasks = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  for (const line of lines) {
    // Match numbered lists (1., 2., etc.)
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      tasks.push(numberedMatch[1].trim());
      continue;
    }

    // Match bullet points (•, -, *, etc.)
    const bulletMatch = line.match(/^[•\-*]\s+(.+)$/);
    if (bulletMatch) {
      tasks.push(bulletMatch[1].trim());
      continue;
    }

    // Match tasks with leading dash (with or without space)
    const dashMatch = line.match(/^-\s*(.+)$/);
    if (dashMatch) {
      tasks.push(dashMatch[1].trim());
      continue;
    }

    // If line is substantial and not a section header, treat it as a task
    if (line.length > 3 && !line.endsWith(':')) {
      tasks.push(line);
    }
  }

  return tasks.filter((task, index, self) => 
    task.length > 0 && self.indexOf(task) === index
  );
}

/**
 * Parse Word document using mammoth
 * @param {string} filePath - Path to the Word document
 * @returns {Promise<{text: string, tasks: Array<string>}>} Extracted text and tasks
 */
async function parseWordDocument(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    
    const result = await mammoth.extractRawText({
      buffer: fileBuffer
    });

    if (result.messages && result.messages.length > 0) {
      console.warn('Mammoth parsing warnings:', result.messages);
    }

    const text = result.value || '';
    const tasks = extractTasksFromText(text);

    return {
      text,
      tasks
    };
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
}

/**
 * Create GitHub issues from extracted tasks
 * @param {Object} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Array<string>} tasks - Array of task descriptions
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} Created issues
 */
async function createGitHubIssues(octokit, owner, repo, tasks, options = {}) {
  const { labels = [], assignee = null } = options;
  const createdIssues = [];

  for (const task of tasks) {
    try {
      const issueParams = {
        owner,
        repo,
        title: task.substring(0, 100), // GitHub has title length limits
        body: task.length > 100 ? task : `Task: ${task}`,
        labels: Array.isArray(labels) ? labels : []
      };

      if (assignee) {
        issueParams.assignees = [assignee];
      }

      const response = await octokit.issues.create(issueParams);
      createdIssues.push({
        number: response.data.number,
        title: response.data.title,
        url: response.data.html_url
      });

      console.log(`Created issue #${response.data.number}: ${response.data.title}`);
    } catch (error) {
      console.error(`Failed to create issue for task "${task}":`, error.message);
      createdIssues.push({
        task,
        error: error.message
      });
    }
  }

  return createdIssues;
}

/**
 * Upload and process a Word document
 * POST /api/upload
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function uploadFile(req, res) {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file type
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload a Word document (.docx or .doc)'
      });
    }

    // Parse the Word document
    const filePath = req.file.path;
    const { text, tasks } = await parseWordDocument(filePath);

    // Validate that tasks were extracted
    if (!tasks || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tasks could be extracted from the document'
      });
    }

    // Initialize Octokit with GitHub token
    const githubToken = req.headers['x-github-token'] || process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(401).json({
        success: false,
        error: 'GitHub token not provided'
      });
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get repository information from request
    const { owner, repo, labels, assignee } = req.body;

    if (!owner || !repo) {
      return res.status(400).json({
        success: false,
        error: 'Repository owner and name are required'
      });
    }

    // Create GitHub issues from extracted tasks
    const createdIssues = await createGitHubIssues(
      octokit,
      owner,
      repo,
      tasks,
      { labels, assignee }
    );

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.warn(`Failed to delete temporary file: ${unlinkError.message}`);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully processed document and created ${createdIssues.filter(i => !i.error).length} issues`,
      data: {
        tasksExtracted: tasks.length,
        issuesCreated: createdIssues.filter(i => !i.error).length,
        details: createdIssues
      }
    });
  } catch (error) {
    // Clean up on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn(`Failed to delete temporary file: ${unlinkError.message}`);
      }
    }

    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during file processing'
    });
  }
}

module.exports = {
  uploadFile,
  parseWordDocument,
  extractTasksFromText,
  createGitHubIssues
};
