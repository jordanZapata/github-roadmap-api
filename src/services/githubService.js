const { GraphQLClient, gql } = require('graphql-request');

/**
 * GitHub Service
 * Provides GraphQL client implementation for creating issues and managing projects
 */
class GitHubService {
  constructor(token) {
    this.token = token;
    this.endpoint = 'https://api.github.com/graphql';
    this.client = new GraphQLClient(this.endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Create an issue in a GitHub repository
   * @param {Object} params - Parameters for creating an issue
   * @param {string} params.owner - Repository owner
   * @param {string} params.repo - Repository name
   * @param {string} params.title - Issue title
   * @param {string} params.body - Issue body/description
   * @param {Array<string>} params.labels - Issue labels
   * @param {Array<string>} params.assignees - User logins to assign
   * @returns {Promise<Object>} Created issue object
   */
  async createIssue({ owner, repo, title, body, labels = [], assignees = [] }) {
    const mutation = gql`
      mutation CreateIssue(
        $repositoryId: ID!
        $title: String!
        $body: String
        $labelIds: [ID!]
        $assigneeIds: [ID!]
      ) {
        createIssue(
          input: {
            repositoryId: $repositoryId
            title: $title
            body: $body
            labelIds: $labelIds
            assigneeIds: $assigneeIds
          }
        ) {
          issue {
            id
            number
            title
            body
            url
            createdAt
            state
            labels(first: 10) {
              nodes {
                name
                color
              }
            }
            assignees(first: 10) {
              nodes {
                login
                name
              }
            }
          }
        }
      }
    `;

    try {
      // Get repository ID
      const repoId = await this.getRepositoryId(owner, repo);

      // Get label IDs
      let labelIds = [];
      if (labels.length > 0) {
        labelIds = await this.getLabelIds(repoId, labels);
      }

      // Get assignee IDs
      let assigneeIds = [];
      if (assignees.length > 0) {
        assigneeIds = await this.getAssigneeIds(assignees);
      }

      const variables = {
        repositoryId: repoId,
        title,
        body: body || '',
        labelIds,
        assigneeIds,
      };

      const data = await this.client.request(mutation, variables);
      return data.createIssue.issue;
    } catch (error) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  /**
   * Get repository ID by owner and name
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<string>} Repository ID
   */
  async getRepositoryId(owner, repo) {
    const query = gql`
      query GetRepositoryId($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
        }
      }
    `;

    try {
      const data = await this.client.request(query, { owner, name: repo });
      return data.repository.id;
    } catch (error) {
      throw new Error(`Failed to get repository ID: ${error.message}`);
    }
  }

  /**
   * Get label IDs by label names
   * @param {string} repositoryId - Repository ID
   * @param {Array<string>} labels - Label names
   * @returns {Promise<Array<string>>} Label IDs
   */
  async getLabelIds(repositoryId, labels) {
    const query = gql`
      query GetLabels($repositoryId: ID!, $labelNames: [String!]!) {
        repository(id: $repositoryId) {
          labels(first: 100, query: $labelNames) {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        repositoryId,
        labelNames: labels,
      });

      return data.repository.labels.nodes.map((label) => label.id);
    } catch (error) {
      throw new Error(`Failed to get label IDs: ${error.message}`);
    }
  }

  /**
   * Get assignee IDs by user logins
   * @param {Array<string>} logins - User logins
   * @returns {Promise<Array<string>>} User IDs
   */
  async getAssigneeIds(logins) {
    const promises = logins.map((login) => this.getUserId(login));
    return Promise.all(promises);
  }

  /**
   * Get user ID by login
   * @param {string} login - User login
   * @returns {Promise<string>} User ID
   */
  async getUserId(login) {
    const query = gql`
      query GetUser($login: String!) {
        user(login: $login) {
          id
        }
      }
    `;

    try {
      const data = await this.client.request(query, { login });
      return data.user.id;
    } catch (error) {
      throw new Error(`Failed to get user ID for ${login}: ${error.message}`);
    }
  }

  /**
   * Create a GitHub project
   * @param {Object} params - Parameters for creating a project
   * @param {string} params.ownerId - Owner ID (user or organization)
   * @param {string} params.title - Project title
   * @param {string} params.description - Project description
   * @returns {Promise<Object>} Created project object
   */
  async createProject({ ownerId, title, description = '' }) {
    const mutation = gql`
      mutation CreateProject($ownerId: ID!, $title: String!, $description: String) {
        createProject(
          input: { ownerId: $ownerId, title: $title, body: $description }
        ) {
          project {
            id
            title
            body
            url
            createdAt
            state
          }
        }
      }
    `;

    try {
      const variables = {
        ownerId,
        title,
        description,
      };

      const data = await this.client.request(mutation, variables);
      return data.createProject.project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get projects for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} first - Number of projects to fetch
   * @returns {Promise<Array<Object>>} Array of projects
   */
  async getRepositoryProjects(owner, repo, first = 10) {
    const query = gql`
      query GetRepositoryProjects($owner: String!, $repo: String!, $first: Int!) {
        repository(owner: $owner, name: $repo) {
          projectsV2(first: $first) {
            nodes {
              id
              title
              url
              state
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        owner,
        repo,
        first,
      });

      return data.repository.projectsV2.nodes;
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Add issue to project
   * @param {Object} params - Parameters for adding issue to project
   * @param {string} params.projectId - Project ID
   * @param {string} params.issueId - Issue ID
   * @returns {Promise<Object>} Project item object
   */
  async addIssueToProject({ projectId, issueId }) {
    const mutation = gql`
      mutation AddIssueToProject($projectId: ID!, $issueId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $issueId }) {
          item {
            id
            contentType
            type
            createdAt
          }
        }
      }
    `;

    try {
      const variables = {
        projectId,
        issueId,
      };

      const data = await this.client.request(mutation, variables);
      return data.addProjectV2ItemById.item;
    } catch (error) {
      throw new Error(`Failed to add issue to project: ${error.message}`);
    }
  }

  /**
   * Update issue
   * @param {Object} params - Parameters for updating an issue
   * @param {string} params.issueId - Issue ID
   * @param {string} params.title - Updated title
   * @param {string} params.body - Updated body
   * @param {string} params.state - Updated state (OPEN or CLOSED)
   * @returns {Promise<Object>} Updated issue object
   */
  async updateIssue({ issueId, title, body, state }) {
    const mutation = gql`
      mutation UpdateIssue(
        $issueId: ID!
        $title: String
        $body: String
        $state: IssueState
      ) {
        updateIssue(
          input: {
            id: $issueId
            title: $title
            body: $body
            state: $state
          }
        ) {
          issue {
            id
            number
            title
            body
            state
            updatedAt
          }
        }
      }
    `;

    try {
      const variables = {
        issueId,
        ...(title && { title }),
        ...(body && { body }),
        ...(state && { state }),
      };

      const data = await this.client.request(mutation, variables);
      return data.updateIssue.issue;
    } catch (error) {
      throw new Error(`Failed to update issue: ${error.message}`);
    }
  }

  /**
   * Close an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise<Object>} Closed issue object
   */
  async closeIssue(issueId) {
    return this.updateIssue({
      issueId,
      state: 'CLOSED',
    });
  }

  /**
   * Reopen an issue
   * @param {string} issueId - Issue ID
   * @returns {Promise<Object>} Reopened issue object
   */
  async reopenIssue(issueId) {
    return this.updateIssue({
      issueId,
      state: 'OPEN',
    });
  }

  /**
   * Get issues for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} filters - Filter options
   * @param {string} filters.state - Filter by state (OPEN, CLOSED, or ALL)
   * @param {number} filters.first - Number of issues to fetch
   * @returns {Promise<Array<Object>>} Array of issues
   */
  async getRepositoryIssues(owner, repo, filters = {}) {
    const { state = 'OPEN', first = 20 } = filters;

    const query = gql`
      query GetRepositoryIssues(
        $owner: String!
        $repo: String!
        $states: [IssueState!]
        $first: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          issues(first: $first, states: $states, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes {
              id
              number
              title
              body
              state
              createdAt
              updatedAt
              url
              author {
                login
              }
              labels(first: 5) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    `;

    try {
      const states = state === 'ALL' ? ['OPEN', 'CLOSED'] : [state];
      const data = await this.client.request(query, {
        owner,
        repo,
        states,
        first,
      });

      return data.repository.issues.nodes;
    } catch (error) {
      throw new Error(`Failed to get issues: ${error.message}`);
    }
  }

  /**
   * Add comment to issue
   * @param {string} subjectId - Issue ID
   * @param {string} body - Comment body
   * @returns {Promise<Object>} Created comment object
   */
  async addCommentToIssue(subjectId, body) {
    const mutation = gql`
      mutation AddComment($subjectId: ID!, $body: String!) {
        addComment(input: { subjectId: $subjectId, body: $body }) {
          commentEdge {
            node {
              id
              body
              createdAt
              author {
                login
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(mutation, {
        subjectId,
        body,
      });

      return data.addComment.commentEdge.node;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }
}

module.exports = GitHubService;
