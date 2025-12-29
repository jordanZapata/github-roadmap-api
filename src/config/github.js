const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  },
});

module.exports = {
  client,
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
  projectId: process.env.GITHUB_PROJECT_ID,
};