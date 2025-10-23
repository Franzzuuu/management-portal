// src/lib/file-integrity.js
import crypto from 'crypto';

export class FileIntegrityValidator {
    /**
     * Calculate hash for file buffer
     */
    static calculateHash(buffer, algorithm = 'sha256') {
        const hash = crypto.createHash(algorithm);
        hash.update(buffer);
        return hash.digest('hex');
    }

    /**
     * Validate CSV file format and structure
     */
    static validateCSV(buffer) {
        try {
            const content = buffer.toString('utf-8');

            // Check for basic CSV structure
            const lines = content.split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                return { valid: false, error: 'Empty CSV file' };
            }

            // Check for metadata header (should start with #)
            const metadataLines = lines.filter(line => line.startsWith('#'));
            if (metadataLines.length === 0) {
                return { valid: false, error: 'Missing CSV metadata header' };
            }

            // Find the actual data start (first non-comment line)
            const dataStart = lines.findIndex(line => !line.startsWith('#'));
            if (dataStart === -1) {
                return { valid: false, error: 'No data rows found in CSV' };
            }

            // Validate header row exists
            const headerRow = lines[dataStart];
            if (!headerRow || headerRow.trim() === '') {
                return { valid: false, error: 'Missing CSV header row' };
            }

            // Check for proper CSV escaping (basic validation)
            const columns = headerRow.split(',');
            if (columns.length === 0) {
                return { valid: false, error: 'Invalid CSV header format' };
            }

            // Validate data rows have consistent column count
            const dataRows = lines.slice(dataStart + 1);
            for (let i = 0; i < Math.min(5, dataRows.length); i++) {
                const row = dataRows[i];
                const rowColumns = row.split(',');
                if (rowColumns.length !== columns.length) {
                    return {
                        valid: false,
                        error: `Inconsistent column count at row ${i + 2}. Expected ${columns.length}, got ${rowColumns.length}`
                    };
                }
            }

            return {
                valid: true,
                metadata: {
                    rows: dataRows.length,
                    columns: columns.length,
                    encoding: 'utf-8',
                    hasHeader: true,
                    hasMetadata: true
                }
            };

        } catch (error) {
            return { valid: false, error: `CSV validation error: ${error.message}` };
        }
    }

    /**
     * Validate XLSX file format and structure
     */
    static async validateXLSX(buffer) {
        try {
            // Basic XLSX file signature validation
            const signature = buffer.subarray(0, 4);
            const xlsxSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // ZIP signature (XLSX is ZIP-based)

            if (!signature.equals(xlsxSignature)) {
                return { valid: false, error: 'Invalid XLSX file signature' };
            }

            // Check file size is reasonable (not empty, not too large)
            if (buffer.length < 100) {
                return { valid: false, error: 'XLSX file too small to be valid' };
            }

            if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
                return { valid: false, error: 'XLSX file too large (>50MB)' };
            }

            // Try to validate ZIP structure (basic check)
            const zipFooterSignature = Buffer.from([0x50, 0x4B, 0x05, 0x06]);
            const hasZipFooter = buffer.includes(zipFooterSignature);

            if (!hasZipFooter) {
                return { valid: false, error: 'Invalid XLSX ZIP structure' };
            }

            // Check for required XLSX internal files (basic validation)
            const content = buffer.toString('binary');
            const requiredFiles = [
                'xl/workbook.xml',
                'xl/worksheets/',
                '[Content_Types].xml'
            ];

            for (const file of requiredFiles) {
                if (!content.includes(file)) {
                    return {
                        valid: false,
                        error: `Missing required XLSX component: ${file}`
                    };
                }
            }

            return {
                valid: true,
                metadata: {
                    fileSize: buffer.length,
                    format: 'xlsx',
                    compressed: true
                }
            };

        } catch (error) {
            return { valid: false, error: `XLSX validation error: ${error.message}` };
        }
    }

    /**
     * Validate PDF file format and structure
     */
    static validatePDF(buffer) {
        try {
            // Check PDF signature
            const pdfSignature = Buffer.from('%PDF-');
            if (!buffer.subarray(0, 5).equals(pdfSignature)) {
                return { valid: false, error: 'Invalid PDF file signature' };
            }

            // Check for PDF version
            const versionMatch = buffer.subarray(0, 20).toString().match(/%PDF-(\d+\.\d+)/);
            if (!versionMatch) {
                return { valid: false, error: 'Invalid PDF version format' };
            }

            // Check for EOF marker
            const content = buffer.toString('binary');
            if (!content.includes('%%EOF')) {
                return { valid: false, error: 'Missing PDF EOF marker' };
            }

            // Basic structure validation
            if (!content.includes('/Type /Catalog') && !content.includes('/Type/Catalog')) {
                return { valid: false, error: 'Missing PDF catalog' };
            }

            return {
                valid: true,
                metadata: {
                    version: versionMatch[1],
                    fileSize: buffer.length,
                    format: 'pdf'
                }
            };

        } catch (error) {
            return { valid: false, error: `PDF validation error: ${error.message}` };
        }
    }

    /**
     * Comprehensive file validation
     */
    static async validateExportFile(buffer, format, expectedMetadata = {}) {
        const hash = this.calculateHash(buffer);

        let formatValidation;
        switch (format.toLowerCase()) {
            case 'csv':
                formatValidation = this.validateCSV(buffer);
                break;
            case 'xlsx':
                formatValidation = await this.validateXLSX(buffer);
                break;
            case 'pdf':
                formatValidation = this.validatePDF(buffer);
                break;
            default:
                return {
                    valid: false,
                    error: `Unsupported format for validation: ${format}`
                };
        }

        // Combine results
        const result = {
            hash,
            fileSize: buffer.length,
            format: format.toLowerCase(),
            timestamp: new Date().toISOString(),
            ...formatValidation
        };

        // Validate against expected metadata if provided
        if (formatValidation.valid && expectedMetadata.expectedRows) {
            if (formatValidation.metadata?.rows !== undefined &&
                formatValidation.metadata.rows !== expectedMetadata.expectedRows) {
                result.warnings = result.warnings || [];
                result.warnings.push(
                    `Row count mismatch: expected ${expectedMetadata.expectedRows}, got ${formatValidation.metadata.rows}`
                );
            }
        }

        return result;
    }

    /**
     * Create integrity report for export job
     */
    static createIntegrityReport(validationResult, jobMetadata = {}) {
        return {
            job_id: jobMetadata.jobId,
            file_hash: validationResult.hash,
            file_size: validationResult.fileSize,
            format: validationResult.format,
            validation_status: validationResult.valid ? 'passed' : 'failed',
            validation_errors: validationResult.error ? [validationResult.error] : [],
            validation_warnings: validationResult.warnings || [],
            metadata: validationResult.metadata || {},
            validated_at: validationResult.timestamp,
            validator_version: '1.0.0'
        };
    }
}

export default FileIntegrityValidator;