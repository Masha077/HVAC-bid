const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument();
const targetPath = path.join(__dirname, 'HVAC-villivakkam-br-air-conditioning-tender.pdf');
const stream = fs.createWriteStream(targetPath);

doc.pipe(stream);

doc.fontSize(16).text('HVAC Villivakkam BR Air Conditioning Tender Specification', { underline: true });
doc.moveDown();
doc.fontSize(12).text('Project: Villivakkam Chennai Office Air Conditioning and Ventilation System.');
doc.text('Scope of work includes supply, installation, testing and commissioning of 3 units of 5 TR VRF outdoor units, ductwork, dampers, and air distribution grills.');
doc.text('Tender Reference: TENDER-VILLIVAKKAM-HVAC-2026-001');

doc.end();

stream.on('finish', () => {
  console.log('PDFKit sample PDF created successfully at:', targetPath);
});
