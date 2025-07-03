import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

function amountToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num > 9999999) return 'Amount too large';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rest = num % 100;

  let words = '';
  if (crore) words += (crore < 20 ? a[crore] : b[Math.floor(crore / 10)] + (a[crore % 10] ? ' ' + a[crore % 10] : '')) + ' Crore ';
  if (lakh) words += (lakh < 20 ? a[lakh] : b[Math.floor(lakh / 10)] + (a[lakh % 10] ? ' ' + a[lakh % 10] : '')) + ' Lakh ';
  if (thousand) words += (thousand < 20 ? a[thousand] : b[Math.floor(thousand / 10)] + (a[thousand % 10] ? ' ' + a[thousand % 10] : '')) + ' Thousand ';
  if (hundred) words += a[hundred] + ' Hundred ';
  if (rest) words += (rest < 20 ? a[rest] : b[Math.floor(rest / 10)] + (a[rest % 10] ? ' ' + a[rest % 10] : ''));

  return words.trim() + ' Rupees Only';
}

export const generateFeeReceiptPDF = async (student, feeData, amountPaid, notes) => {
  // A5 dimensions: 148mm x 210mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors
  const primaryColor = [25, 25, 112]; // Dark blue
  const secondaryColor = [70, 70, 70]; // Dark gray
  const lightGray = [150, 150, 150];

  // Generate QR Code
  let qrCodeImage = null;
  try {
    const url = `https://fccthegurukul.in/student/${student.fcc_id}`;
    qrCodeImage = await QRCode.toDataURL(url, { 
      width: 120, 
      margin: 1, 
      color: { dark: '#191970', light: '#FFFFFF' } 
    });
  } catch (e) {
    console.error("QR Code error:", e);
  }

  let yPosition = 12;

  // Header Section with Border
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, yPosition - 2, contentWidth, 28, 'F');
  
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition - 2, contentWidth, 28);

  // School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('FCC THE GURUKUL', pageWidth / 2, yPosition + 5, { align: 'center' });

  // Address and Contact
  doc.setFontSize(7);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Motisabad, Mugaon, Bihar (802126)', pageWidth / 2, yPosition + 10, { align: 'center' });
  doc.text('Phone: +91-9135365331 | Email: fccthegurukul@gmail.com', pageWidth / 2, yPosition + 14, { align: 'center' });

  // Receipt Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('FEE RECEIPT', pageWidth / 2, yPosition + 20, { align: 'center' });

  yPosition += 32;

  // Receipt Info Section
  const receiptNo = `FEE/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
  const currentDate = new Date();
  const issueDate = currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const issueTime = currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Receipt info box
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPosition, contentWidth, 18, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition, contentWidth, 18);

  doc.setFontSize(7);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  
  // Left side info
  doc.text(`Parchi Sankhya: ${receiptNo}`, margin + 2, yPosition + 5);
  doc.text(`Tareekh: ${issueDate}`, margin + 2, yPosition + 9);
  doc.text(`Samay: ${issueTime}`, margin + 2, yPosition + 13);
  
  // Right side info
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text('Sthiti: Jama Hua', pageWidth - margin - 2, yPosition + 5, { align: 'right' });
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Session: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, pageWidth - margin - 2, yPosition + 9, { align: 'right' });

  yPosition += 24;

  // Student Details Section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('STUDENT ki Jankari', margin, yPosition);

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 2, margin + 40, yPosition + 2);

  yPosition += 8;

  // Student info in two columns
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  
  const leftCol = margin + 2;
  const rightCol = pageWidth / 2 + 5;
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', leftCol, yPosition);
  doc.text('Father:', leftCol, yPosition + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.text(student.name, leftCol + 15, yPosition);
  doc.text(student.father, leftCol + 15, yPosition + 6);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Student ID:', rightCol, yPosition);
  doc.text('Class:', rightCol, yPosition + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.text(student.fcc_id, rightCol + 20, yPosition);
  doc.text(student.fcc_class, rightCol + 20, yPosition + 6);

  yPosition += 18;

  // Fee Details Section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Shulk ki Jaankari', margin, yPosition);

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 2, margin + 30, yPosition + 2);

  yPosition += 6;

  // Fee Table
  doc.autoTable({
    startY: yPosition,
    head: [["Vivaran", "Kul Shulk", "Jama Hua Shulk", "Bacha Hua Shulk"]],
    body: [[
      `Coaching Fee - ${student.fcc_class}`,
      `${parseFloat(feeData.total_fee).toLocaleString('en-IN')}`,
      `${parseFloat(amountPaid).toLocaleString('en-IN')}`,
      `${parseFloat(feeData.fee_remaining).toLocaleString('en-IN')}`
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7,
      textColor: [40, 40, 40],
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      cellPadding: 2,
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: [230, 240, 255],
      textColor: [25, 25, 112],
      fontSize: 7,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: contentWidth * 0.45 },
      1: { halign: 'right', cellWidth: contentWidth * 0.18 },
      2: { halign: 'right', cellWidth: contentWidth * 0.18 },
      3: { halign: 'right', cellWidth: contentWidth * 0.19 },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = doc.lastAutoTable.finalY + 8;

  // Amount in Words Section
  const amountInWords = amountToWords(parseFloat(amountPaid));
  
  doc.setFillColor(248, 252, 255);
  doc.rect(margin, yPosition, contentWidth, 12, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition, contentWidth, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text('Amount in Words:', margin + 2, yPosition + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...secondaryColor);
  doc.text(amountInWords, margin + 2, yPosition + 8, { maxWidth: contentWidth - 4 });

  yPosition += 16;

  // Notes Section
  if (notes && notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('Tippaniyaan:', margin, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...secondaryColor);
    doc.text(notes, margin, yPosition + 5, { maxWidth: contentWidth });
    yPosition += 12;
  }

  // REDESIGNED FOOTER SECTION
  const footerY = Math.max(yPosition + 10, pageHeight - 45);
  
  // Footer background
  doc.setFillColor(250, 250, 252);
  doc.rect(margin, footerY - 2, contentWidth, 40, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, footerY - 2, contentWidth, 40);

  // QR Code Section - Left side with proper positioning
  if (qrCodeImage) {
    const qrSize = 20;
    const qrX = margin + 8;
    const qrY = footerY + 2;
    
    // QR Code background
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 'F');
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2);
    
    // Add QR Code
    doc.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // QR Code label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text('Scan Karein', qrX + qrSize/2, qrY + qrSize + 4, { align: 'center' });
    doc.text('Student ki Jaankari Ke liye', qrX + qrSize/2, qrY + qrSize + 7, { align: 'center' });
  }

  // Main Footer Content - Right side
  const textStartX = margin + 40;
  const textWidth = contentWidth - 32;
  
  // School info section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('FCC THE GURUKUL', textStartX, footerY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...secondaryColor);
  doc.text('Motisabad, Mugaon, Bihar - 802126', textStartX, footerY + 10);
  
  // Contact info with icons
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...primaryColor);
  doc.text('+91-9135365331', textStartX, footerY + 15);
  doc.text('www.fccthegurukul.in', textStartX, footerY + 19);
  doc.text('fccthegurukul@gmail.com', textStartX, footerY + 23);

  // Thank you message - centered
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Aapke payment ke liye dhanyavaad!', pageWidth / 2, footerY + 30, { align: 'center' });

  // Bottom border line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(margin + 5, footerY + 34, pageWidth - margin - 5, footerY + 34);

  // Computer generated note - bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...lightGray);
  doc.text('Yeh computer se bani hui receipt hai. Agar kuch poochna ho toh coaching office se sampark karein.', 
    pageWidth / 2, pageHeight - 3, { align: 'center' });

  // // Save File
  // const fileName = `FeeReceipt_${student.name.replace(/\s+/g, '_')}_${student.fcc_id}_${receiptNo.replace(/\//g, '_')}.pdf`;
  // doc.save(fileName);

   const fileName = `FeeReceipt_${student.name.replace(/\s+/g, '_')}_${student.fcc_id}_${receiptNo.replace(/\//g, '_')}.pdf`;
  doc.save(fileName);

  // रिटर्न ऑब्जेक्ट को थोड़ा अपडेट करें
  return {
    success: true,
    receiptNo,
    fileName,
    amountPaid: parseFloat(amountPaid),
    amountInWords,
    issueDate: currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    issueTime: currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    paymentDate: currentDate.toISOString() // << यह लाइन डेटाबेस के लिए है
  };
};