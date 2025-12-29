# GitHub Roadmap API

A Python API service that enables seamless integration with GitHub by allowing users to upload Word documents, parse their content, and automatically create GitHub issues with extracted roadmap information.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [GitHub Token Setup](#github-token-setup)
- [Project Structure](#project-structure)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Upload Word Files](#upload-word-files)
  - [Create GitHub Issues](#create-github-issues)
  - [API Endpoints](#api-endpoints)
- [Examples](#examples)
  - [Python Examples](#python-examples)
  - [cURL Examples](#curl-examples)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## Features

- **Word Document Parsing**: Extract content from `.docx` files
- **GitHub Integration**: Seamlessly create GitHub issues from parsed content
- **Token Management**: Secure GitHub token configuration
- **RESTful API**: Easy-to-use HTTP endpoints for integration
- **Error Handling**: Comprehensive error messages and validation
- **Rate Limiting**: Respects GitHub API rate limits
- **Issue Templates**: Pre-configured templates for consistency

---

## Requirements

- Python 3.8 or higher
- pip (Python package manager)
- GitHub account with personal access token
- A GitHub repository to create issues in

### Dependencies

The following Python packages are required:

- `flask` - Web framework for API endpoints
- `python-docx` - Parse Word documents
- `PyGithub` - GitHub API integration
- `python-dotenv` - Environment variable management
- `requests` - HTTP client library

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/jordanZapata/github-roadmap-api.git
cd github-roadmap-api
```

### Step 2: Create a Virtual Environment

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Create Environment Configuration

```bash
cp .env.example .env
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=your_repository_name

# API Configuration
FLASK_ENV=development
FLASK_DEBUG=True
API_PORT=5000
API_HOST=0.0.0.0

# File Upload Configuration
UPLOAD_FOLDER=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=docx,doc

# Logging Configuration
LOG_LEVEL=INFO
```

### Configuration File

If using a `config.py` file instead of environment variables:

```python
import os

class Config:
    GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
    GITHUB_REPO_OWNER = os.getenv('GITHUB_REPO_OWNER')
    GITHUB_REPO_NAME = os.getenv('GITHUB_REPO_NAME')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10485760))
```

---

## GitHub Token Setup

### Creating a Personal Access Token

1. **Log in to GitHub** and navigate to [GitHub Settings](https://github.com/settings/profile)
2. Click **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click **Generate new token (classic)**
4. **Configure the token:**
   - **Token name**: Name your token (e.g., "Roadmap API Token")
   - **Expiration**: Set an appropriate expiration date
   - **Scopes**: Select the following permissions:
     - `repo` (Full control of private repositories)
     - `workflow` (Update GitHub Action workflows)
     - `admin:repo_hook` (Access repository hooks)

5. Click **Generate token** and **copy the token immediately**

### Adding the Token to Your Environment

```bash
# Linux/macOS
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env

# Windows (PowerShell)
Add-Content .env "GITHUB_TOKEN=ghp_your_token_here"
```

### Token Security Best Practices

- ⚠️ **Never** commit your `.env` file to version control
- ⚠️ **Never** share your token publicly
- Use `.gitignore` to exclude `.env`:
  ```
  .env
  .env.local
  *.env
  ```
- Rotate your token periodically
- Delete unused tokens

---

## Project Structure

```
github-roadmap-api/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── .env.example             # Example environment variables
├── .gitignore               # Git ignore rules
├── app.py                   # Main Flask application
├── config.py                # Configuration settings
├── src/
│   ├── __init__.py
│   ├── github_service.py    # GitHub API interactions
│   ├── document_parser.py   # Word document parsing
│   ├── validators.py        # Input validation
│   └── utils.py             # Utility functions
├── routes/
│   ├── __init__.py
│   ├── document.py          # Document upload endpoints
│   ├── issues.py            # Issue creation endpoints
│   └── health.py            # Health check endpoints
├── uploads/                 # Uploaded files directory
├── logs/                    # Application logs
└── tests/                   # Unit and integration tests
    ├── test_document_parser.py
    ├── test_github_service.py
    └── test_api_endpoints.py
```

---

## Usage

### Starting the Server

```bash
# Development mode
python app.py

# Production mode with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

The API will be available at `http://localhost:5000`

### Basic Usage

The API follows REST conventions with the following structure:

```
POST /api/documents/upload      - Upload and parse Word document
POST /api/issues/create         - Create GitHub issue
GET  /api/health                - Check API health
```

---

## Upload Word Files

### Endpoint

```
POST /api/documents/upload
Content-Type: multipart/form-data
```

### Request

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@roadmap.docx" \
  -F "extract_images=false"
```

### Response (Success)

```json
{
  "status": "success",
  "message": "Document uploaded and parsed successfully",
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "roadmap.docx",
  "upload_timestamp": "2025-12-29T19:38:59Z",
  "content": {
    "title": "Product Roadmap Q1 2026",
    "sections": [
      {
        "heading": "New Features",
        "paragraphs": ["Feature 1 description", "Feature 2 description"]
      }
    ],
    "tables": [
      {
        "headers": ["Task", "Status", "Owner"],
        "rows": [...]
      }
    ]
  },
  "metadata": {
    "page_count": 5,
    "word_count": 1250,
    "paragraphs_found": 12,
    "tables_found": 3
  }
}
```

### Response (Error)

```json
{
  "status": "error",
  "message": "File size exceeds maximum limit of 10MB",
  "error_code": "FILE_TOO_LARGE"
}
```

### Supported File Formats

- `.docx` - Modern Microsoft Word format (recommended)
- `.doc` - Legacy Microsoft Word format

---

## Create GitHub Issues

### Endpoint

```
POST /api/issues/create
Content-Type: application/json
```

### Request Body

```json
{
  "title": "New API Authentication Feature",
  "description": "Implement OAuth2 authentication for external integrations",
  "labels": ["enhancement", "high-priority"],
  "assignee": "jordanZapata",
  "milestone": "Q1 2026",
  "project": "Product Roadmap",
  "priority": "high"
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Issue title (max 255 characters) |
| `description` | string | No | Issue body/description (markdown supported) |
| `labels` | array | No | GitHub label names (must exist in repo) |
| `assignee` | string | No | GitHub username to assign issue |
| `milestone` | string | No | Milestone title |
| `project` | string | No | Project board name |
| `priority` | string | No | Priority level: low, medium, high, critical |

### Response (Success)

```json
{
  "status": "success",
  "message": "Issue created successfully",
  "issue_number": 42,
  "issue_url": "https://github.com/jordanZapata/github-roadmap-api/issues/42",
  "html_url": "https://github.com/jordanZapata/github-roadmap-api/issues/42",
  "created_at": "2025-12-29T19:38:59Z",
  "created_by": "jordanZapata"
}
```

### Response (Error)

```json
{
  "status": "error",
  "message": "Failed to create issue: Repository not found",
  "error_code": "GITHUB_API_ERROR",
  "details": {
    "github_error": "404 Not Found",
    "hint": "Verify GITHUB_REPO_OWNER and GITHUB_REPO_NAME in .env"
  }
}
```

---

## API Endpoints

### Document Management

#### Upload and Parse Document
```
POST /api/documents/upload
```
Upload a Word document for parsing.

#### Get Parsed Content
```
GET /api/documents/<file_id>
```
Retrieve previously parsed document content.

#### Delete Uploaded File
```
DELETE /api/documents/<file_id>
```
Remove an uploaded file from the system.

### Issue Management

#### Create Issue
```
POST /api/issues/create
```
Create a new GitHub issue.

#### Get Issue Status
```
GET /api/issues/<issue_number>
```
Retrieve information about a specific issue.

#### Update Issue
```
PATCH /api/issues/<issue_number>
```
Update an existing GitHub issue.

#### List Issues
```
GET /api/issues
```
List all issues in the repository.

### System

#### Health Check
```
GET /api/health
```
Check API health status and dependencies.

---

## Examples

### Python Examples

#### Example 1: Upload Document and Create Issues

```python
import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:5000/api"

# Step 1: Upload Word document
print("Uploading document...")
with open("roadmap.docx", "rb") as f:
    files = {"file": f}
    response = requests.post(
        f"{API_URL}/documents/upload",
        files=files
    )

upload_result = response.json()
if upload_result["status"] == "success":
    file_id = upload_result["file_id"]
    print(f"✓ Document uploaded successfully (ID: {file_id})")
    print(f"✓ Found {upload_result['metadata']['tables_found']} tables")
else:
    print(f"✗ Upload failed: {upload_result['message']}")
    exit(1)

# Step 2: Create GitHub issues from parsed content
print("\nCreating GitHub issues...")
content = upload_result["content"]

for section in content["sections"]:
    issue_data = {
        "title": section["heading"],
        "description": "\n".join(section["paragraphs"]),
        "labels": ["roadmap", "documentation"],
        "priority": "medium"
    }
    
    response = requests.post(
        f"{API_URL}/issues/create",
        json=issue_data
    )
    
    result = response.json()
    if result["status"] == "success":
        print(f"✓ Issue #{result['issue_number']}: {result['issue_url']}")
    else:
        print(f"✗ Failed to create issue: {result['message']}")

print("\n✓ Process completed!")
```

#### Example 2: Batch Issue Creation from Table

```python
import requests

API_URL = "http://localhost:5000/api"

# Sample table from parsed document
tasks = [
    {
        "title": "Implement user authentication",
        "status": "In Progress",
        "owner": "alice"
    },
    {
        "title": "Add payment integration",
        "status": "Planned",
        "owner": "bob"
    },
    {
        "title": "Create admin dashboard",
        "status": "Completed",
        "owner": "charlie"
    }
]

for task in tasks:
    issue_data = {
        "title": task["title"],
        "description": f"**Status**: {task['status']}\n**Owner**: {task['owner']}",
        "assignee": task["owner"],
        "labels": ["task", task["status"].lower().replace(" ", "-")],
        "priority": "high" if task["status"] == "In Progress" else "medium"
    }
    
    response = requests.post(
        f"{API_URL}/issues/create",
        json=issue_data
    )
    
    print(response.json())
```

#### Example 3: Health Check and Configuration Verification

```python
import requests

API_URL = "http://localhost:5000/api"

response = requests.get(f"{API_URL}/health")
health = response.json()

print("API Health Status:")
print(f"  Status: {health.get('status')}")
print(f"  GitHub Connection: {health.get('github_connected')}")
print(f"  Repository: {health.get('repository')}")
print(f"  Uptime: {health.get('uptime')} seconds")

if health.get("status") == "healthy":
    print("✓ All systems operational")
else:
    print("✗ Some systems may have issues")
```

### cURL Examples

#### Example 1: Upload Document

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@roadmap.docx" \
  -F "extract_images=true" \
  -v
```

#### Example 2: Create Issue

```bash
curl -X POST http://localhost:5000/api/issues/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement API rate limiting",
    "description": "Add rate limiting to prevent abuse",
    "labels": ["enhancement", "security"],
    "assignee": "jordanZapata",
    "priority": "high"
  }' \
  -v
```

#### Example 3: Get Issue Status

```bash
curl -X GET http://localhost:5000/api/issues/42 \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -v
```

#### Example 4: Health Check

```bash
curl -X GET http://localhost:5000/api/health \
  -H "Accept: application/json"
```

---

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/jordanZapata/github-roadmap-api.git
cd github-roadmap-api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install development dependencies
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/test_api_endpoints.py -v

# Run with detailed output
pytest -vv
```

### Code Quality

```bash
# Format code with Black
black src/ routes/ tests/

# Lint with Flake8
flake8 src/ routes/

# Type checking with mypy
mypy src/ routes/

# Security check with bandit
bandit -r src/ routes/
```

### Building and Deployment

```bash
# Build Docker image
docker build -t github-roadmap-api:latest .

# Run Docker container
docker run -p 5000:5000 --env-file .env github-roadmap-api:latest

# Deploy to Heroku
heroku login
heroku create github-roadmap-api
git push heroku main
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. **GitHub Token Authentication Failed**

**Error**: `401 Unauthorized: Bad credentials`

**Solution**:
- Verify your GitHub token is correct in `.env`
- Check token hasn't expired
- Ensure token has required scopes: `repo`, `workflow`
- Regenerate token if needed

```bash
# Test token validity
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

#### 2. **Repository Not Found**

**Error**: `404 Not Found: Repository not found`

**Solution**:
- Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` in `.env`
- Ensure you have access to the repository
- Check repository is public or token has private access

```bash
# Example correct configuration
GITHUB_REPO_OWNER=jordanZapata
GITHUB_REPO_NAME=github-roadmap-api
```

#### 3. **File Upload Fails with Size Error**

**Error**: `413 Payload Too Large` or `FILE_TOO_LARGE`

**Solution**:
- Reduce file size below configured limit (default: 10MB)
- Split large documents into smaller parts
- Increase `MAX_FILE_SIZE` in `.env` if needed

#### 4. **Document Parsing Returns Empty Content**

**Error**: No text extracted from document

**Solution**:
- Verify file is not password-protected
- Ensure file is valid `.docx` format
- Try opening file in Microsoft Word to verify integrity
- Check file is not corrupted

#### 5. **Rate Limiting Issues**

**Error**: `403 API rate limit exceeded`

**Solution**:
- Wait before making additional requests
- Check current rate limit status:
  ```bash
  curl -H "Authorization: token YOUR_TOKEN" \
    https://api.github.com/rate_limit
  ```
- Implement exponential backoff in requests
- Consider using GitHub's higher rate limits for authenticated apps

#### 6. **CORS Errors**

**Error**: `Cross-Origin Request Blocked`

**Solution**:
- Ensure API is running on correct host/port
- Check CORS is properly configured in Flask app
- Verify frontend is making requests to correct API endpoint

#### 7. **Label Not Found Error**

**Error**: `404 Not Found: Label not found`

**Solution**:
- Create labels in repository first
- Use existing label names exactly
- Check label names are case-sensitive

```bash
# Create a new label via API
curl -X POST https://api.github.com/repos/OWNER/REPO/labels \
  -H "Authorization: token YOUR_TOKEN" \
  -d '{
    "name": "roadmap",
    "color": "0366d6",
    "description": "Related to roadmap items"
  }'
```

### Debug Mode

Enable detailed logging:

```bash
# In .env
LOG_LEVEL=DEBUG
FLASK_DEBUG=True

# Run app
python app.py
```

### Health Check Diagnostics

```bash
# Check all system components
curl http://localhost:5000/api/health | python -m json.tool

# Expected healthy response:
{
  "status": "healthy",
  "timestamp": "2025-12-29T19:38:59Z",
  "github_connected": true,
  "repository": "jordanZapata/github-roadmap-api",
  "uptime_seconds": 3600,
  "version": "1.0.0",
  "dependencies": {
    "flask": "2.3.2",
    "pygithub": "1.59.1",
    "python-docx": "0.8.11"
  }
}
```

---

## Support

### Getting Help

- **Documentation**: See [docs/](docs/) folder for detailed guides
- **Issues**: Report bugs via [GitHub Issues](https://github.com/jordanZapata/github-roadmap-api/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/jordanZapata/github-roadmap-api/discussions)
- **Email**: Contact maintainers at support@example.com

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

Please ensure all tests pass and code follows project style guidelines.

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

### Version History

- **v1.0.0** (2025-12-29) - Initial release
  - Document upload and parsing
  - GitHub issue creation
  - Basic API endpoints

---

## Additional Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Python-DOCX Documentation](https://python-docx.readthedocs.io/)
- [PyGithub Documentation](https://pygithub.readthedocs.io/)
- [Flask Documentation](https://flask.palletsprojects.com/)

---

**Last Updated**: December 29, 2025

**Maintained by**: jordanZapata

For questions or suggestions, please open an issue or discussion on GitHub.
