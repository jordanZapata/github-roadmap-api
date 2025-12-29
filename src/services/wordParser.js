const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

/**
 * Word Parser Service
 * Handles parsing and extraction of content from Word documents (.docx files)
 */
class WordParser {
  /**
   * Parse a Word document and extract text content
   * @param {string} filePath - Path to the Word document file
   * @returns {Promise<Object>} Parsed document content
   */
  async parseDocument(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      
      return {
        success: true,
        text: result.value,
        messages: result.messages || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        text: null,
      };
    }
  }

  /**
   * Parse a Word document and extract formatted HTML
   * @param {string} filePath - Path to the Word document file
   * @returns {Promise<Object>} Parsed document with HTML formatting
   */
  async parseDocumentAsHtml(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      
      return {
        success: true,
        html: result.value,
        messages: result.messages || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        html: null,
      };
    }
  }

  /**
   * Extract document metadata and structure
   * @param {string} filePath - Path to the Word document file
   * @returns {Promise<Object>} Document metadata and structure info
   */
  async extractMetadata(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      
      const lines = result.value.split('\n').filter(line => line.trim());
      const wordCount = result.value.split(/\s+/).length;
      
      return {
        success: true,
        metadata: {
          filePath,
          fileName: path.basename(filePath),
          wordCount,
          lineCount: lines.length,
          characterCount: result.value.length,
        },
        messages: result.messages || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: null,
      };
    }
  }

  /**
   * Parse multiple Word documents in batch
   * @param {Array<string>} filePaths - Array of paths to Word documents
   * @returns {Promise<Array<Object>>} Array of parsed documents
   */
  async parseDocumentsBatch(filePaths) {
    try {
      const results = await Promise.all(
        filePaths.map(async (filePath) => {
          const result = await this.parseDocument(filePath);
          return {
            filePath,
            ...result,
          };
        })
      );
      
      return {
        success: true,
        results,
        totalProcessed: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Extract specific sections or headings from a Word document
   * @param {string} filePath - Path to the Word document file
   * @returns {Promise<Object>} Sections and headings structure
   */
  async extractStructure(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      
      const lines = result.value.split('\n');
      const sections = [];
      let currentSection = null;
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          if (!currentSection) {
            currentSection = {
              heading: trimmed,
              content: [],
            };
          } else {
            currentSection.content.push(trimmed);
          }
          
          // Consider lines with certain patterns as headings
          if (this._isHeading(trimmed)) {
            if (currentSection.content.length > 0) {
              sections.push(currentSection);
            }
            currentSection = {
              heading: trimmed,
              content: [],
            };
          }
        }
      });
      
      if (currentSection) {
        sections.push(currentSection);
      }
      
      return {
        success: true,
        sections,
        sectionCount: sections.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sections: [],
      };
    }
  }

  /**
   * Check if a line appears to be a heading
   * @private
   * @param {string} line - Line to check
   * @returns {boolean} True if line appears to be a heading
   */
  _isHeading(line) {
    // Simple heuristic: short lines with capital letters are likely headings
    const isBoldPattern = line.length < 100 && line === line.toUpperCase() && line.length > 2;
    const isNumberedHeading = /^\d+\.\s/.test(line) && line.length < 100;
    
    return isBoldPattern || isNumberedHeading;
  }
}

module.exports = WordParser;
