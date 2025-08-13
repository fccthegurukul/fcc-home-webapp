// FeeManagementPanel.js (अंतिम और संयुक्त संस्करण)

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { generateFeeReceiptPDF } from '../utils/generateReceipt';
import styles from './FeeManagementPanel.module.css';
import { Edit, BookCopy, Filter, X, Search, Calendar, Tag, RefreshCw, PlusCircle, ChevronsRight } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

// ====================================================================================
// ===== हेल्पर फंक्शन: छात्रों के डेटा को प्रोसेस करने के लिए =====
// ====================================================================================
const processStudentData = (students) => {
    return students.map(student => {
        const records = student.monthly_fee_records || [];
        
        let totalDue = 0;
        let totalPaid = 0;
        records.forEach(record => {
            totalDue += Number(record.final_due_amount) || 0;
            totalPaid += Number(record.amount_paid) || 0;
        });

        const lastPaymentRecord = records
            .filter(r => r.payment_date)
            .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];

        return {
            ...student,
            total_due: totalDue,
            total_paid: totalPaid,
            total_remaining: totalDue - totalPaid,
            last_payment_date: lastPaymentRecord ? lastPaymentRecord.payment_date : null,
            // मासिक रिकॉर्ड को महीने के हिसाब से सॉर्ट करें (सबसे नया सबसे ऊपर)
            monthly_fee_records: records.sort((a, b) => new Date(b.fee_month) - new Date(a.fee_month))
        };
    });
};


const FeeManagementPanel = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters State
    const [filters, setFilters] = useState({ status: 'all', class: 'all', search: '' });
    const [availableClasses, setAvailableClasses] = useState([]);

    // Modal State
    const [viewingStudent, setViewingStudent] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Logs Modal State (पुराने कोड से)
    const [viewingLogsFor, setViewingLogsFor] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // ====================================================================================
    // ===== डेटा लाना =====
    // ====================================================================================
    const fetchStudentData = async () => {
        setLoading(true);
        setError('');
        const { data, error } = await supabase
            .from('new_student_admission')
            .select(`
                id, name, father, mobile_number, fcc_class, fcc_id, standard_monthly_fee, fee_due_day,
                monthly_fee_records ( * )
            `)
            .order('name', { ascending: true });

        if (error) {
            setError('डेटा लोड करने में त्रुटि हुई: ' + error.message);
        } else {
            const processedData = processStudentData(data || []);
            setStudents(processedData);
            const uniqueClasses = [...new Set((data || []).map(s => s.fcc_class).filter(Boolean))].sort();
            setAvailableClasses(uniqueClasses);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStudentData();
    }, []);

    const refreshStudentDetails = async (studentId) => {
        setModalLoading(true);
        const { data, error } = await supabase
            .from('new_student_admission')
            .select(`*, monthly_fee_records(*)`)
            .eq('id', studentId)
            .single();

        if (!error && data) {
            const [processedStudent] = processStudentData([data]);
            setViewingStudent(processedStudent);
        }
        setModalLoading(false);
    };

    // ====================================================================================
    // ===== फ़िल्टरिंग =====
    // ====================================================================================
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const statusMatch = filters.status === 'all' ||
                                (filters.status === 'baaki' && student.total_remaining > 0) ||
                                (filters.status === 'jamma' && student.total_remaining <= 0);
            const classMatch = filters.class === 'all' || student.fcc_class === filters.class;
            const searchMatch = !filters.search ||
                                student.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                                (student.father && student.father.toLowerCase().includes(filters.search.toLowerCase())) ||
                                (student.fcc_id && student.fcc_id.toLowerCase().includes(filters.search.toLowerCase()));
            return statusMatch && classMatch && searchMatch;
        });
    }, [students, filters]);

    // ====================================================================================
    // ===== मुख्य कार्य (मासिक रिकॉर्ड मैनेज करना) =====
    // ====================================================================================
    
    const handleAddMonth = async (e) => {
        e.preventDefault();
        // ... (यह फंक्शन बिना बदलाव के सही है)
        const formData = new FormData(e.target);
        const feeMonth = formData.get('fee_month') + '-01';
        const baseFee = parseFloat(formData.get('base_fee'));

        const existingRecord = viewingStudent.monthly_fee_records.find(r => r.fee_month === feeMonth);
        if (existingRecord) {
            alert('इस महीने का रिकॉर्ड पहले से ही मौजूद है।');
            return;
        }

        setModalLoading(true);
        const { error } = await supabase.from('monthly_fee_records').insert({
            student_fcc_id: viewingStudent.fcc_id,
            fee_month: feeMonth,
            base_fee: baseFee,
            status: 'due',
        });

        if (error) {
            alert('महीना जोड़ने में त्रुटि: ' + error.message);
        } else {
            alert('महीना सफलतापूर्वक जोड़ा गया!');
            e.target.reset();
            await refreshStudentDetails(viewingStudent.id);
        }
        setModalLoading(false);
    };
    
    const handleMakePayment = async (record, amountToPay, notes) => {
        const paidAmount = parseFloat(amountToPay);
        if (isNaN(paidAmount) || paidAmount <= 0) {
            alert('कृपया एक मान्य राशि दर्ज करें।');
            return;
        }

        setModalLoading(true);

        const newTotalPaid = (record.amount_paid || 0) + paidAmount;
        const remainingForMonth = record.final_due_amount - newTotalPaid;
        const newStatus = remainingForMonth <= 0 ? 'paid' : 'partially_paid';

        const { error: updateError } = await supabase.from('monthly_fee_records')
            .update({
                amount_paid: newTotalPaid,
                status: newStatus,
                payment_date: newStatus === 'paid' ? new Date().toISOString() : record.payment_date,
                notes: (record.notes || '') + `\n[${new Date().toLocaleString('hi-IN')}]: ${notes}`,
            })
            .eq('id', record.id);
        
        if (updateError) {
            alert('भुगतान अपडेट करने में त्रुटि: ' + updateError.message);
            setModalLoading(false);
            return;
        }

        await supabase.from('fee_update_logs').insert({
            fcc_id: viewingStudent.fcc_id,
            updated_by: 'Admin',
            change_details: {
                type: 'Monthly Payment',
                record_id: record.id,
                month: record.fee_month,
                amount_paid_now: paidAmount,
            },
            notes: `मासिक भुगतान: ${notes}`,
        });

        try {
            const receiptDetails = await generateFeeReceiptPDF(viewingStudent, record, paidAmount, notes);
            if (receiptDetails && receiptDetails.success) {
                await supabase.from('fee_receipts').insert({
                    receipt_no: receiptDetails.receiptNo,
                    fcc_id: viewingStudent.fcc_id,
                    student_name: viewingStudent.name,
                    amount_paid: receiptDetails.amountPaid,
                    amount_in_words: receiptDetails.amountInWords,
                    payment_date: receiptDetails.paymentDate,
                    pdf_filename: receiptDetails.fileName,
                    generated_by: 'Admin',
                    notes: `मासिक भुगतान (${new Date(record.fee_month).toLocaleString('hi-IN', { month: 'long' })}): ${notes}`,
                });
                alert('भुगतान सफल! रसीद डाउनलोड हो गई है और रिकॉर्ड सेव हो गया है।');
            }
        } catch (pdfError) {
            console.error("PDF बनाने में त्रुटि:", pdfError);
            alert('भुगतान हो गया, पर रसीद बनाने में समस्या हुई।');
        }

        await refreshStudentDetails(viewingStudent.id);
        setModalLoading(false);
    };

    const handleUpdateDiscount = async (recordId, tag, amount) => {
        // ... (यह फंक्शन बिना बदलाव के सही है)
        const discountAmount = parseFloat(amount);
        if(isNaN(discountAmount) || discountAmount < 0) {
            alert('अमान्य छूट राशि!');
            return;
        }

        setModalLoading(true);
        const { error } = await supabase.from('monthly_fee_records')
            .update({ discount_tag: tag, discount_amount: discountAmount })
            .eq('id', recordId);
        
        if (error) {
            alert('छूट अपडेट करने में त्रुटि: ' + error.message);
        } else {
            alert('छूट सफलतापूर्वक अपडेट की गई!');
            await refreshStudentDetails(viewingStudent.id);
        }
        setModalLoading(false);
    };

    const handleViewLogsClick = async (fcc_id) => {
        setViewingLogsFor(fcc_id);
        setLogsLoading(true);
        const { data, error } = await supabase
            .from('fee_update_logs')
            .select('*')
            .eq('fcc_id', fcc_id)
            .order('updated_at', { ascending: false });

        if (error) {
            alert('लॉग्स लोड करने में त्रुटि: ' + error.message);
            setLogs([]);
        } else {
            setLogs(data || []);
        }
        setLogsLoading(false);
    };


    if (loading) return <div className={styles.centeredMessage}><ClipLoader size={50} /> <p>डेटा लोड हो रहा है...</p></div>;
    if (error) return <div className={styles.centeredMessage}><p className={styles.errorText}>{error}</p></div>;


    // ====================================================================================
    // ===== JSX (UI) Part =====
    // ====================================================================================
    return (
        <div className={styles.panelContainer}>
            <header className={styles.panelHeader}>
                <h1>शुल्क प्रबंधन पैनल (मासिक)</h1>
                <p>विद्यार्थियों की मासिक फीस की स्थिति देखें और प्रबंधित करें।</p>
                <button onClick={fetchStudentData} className={styles.refreshButton}><RefreshCw size={16}/> रिफ्रेश करें</button>
            </header>
            
            <div className={styles.filterBar}>
                <div className={styles.searchGroup}>
                    <Search size={20} className={styles.filterIcon} />
                    <input type="text" placeholder="नाम, पिता या FCC ID से खोजें..." className={styles.searchInput} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                </div>
                <div className={styles.filterGroup}>
                    <Filter size={18} className={styles.filterIcon} />
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                        <option value="all">सभी स्थिति</option> 
                        <option value="baaki">बाकी</option> 
                        <option value="jamma">जम्मा</option>
                    </select>
                    <select value={filters.class} onChange={e => setFilters({...filters, class: e.target.value})}>
                        <option value="all">सभी क्लास</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.studentList}>
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const statusClass = student.total_remaining > 0 ? styles.statusBaaki : styles.statusJamma;
                    return (
                        <div key={student.id} className={`${styles.studentCard} ${statusClass}`}>
                            <div className={styles.cardContent}>
                                <div className={styles.studentInfo}>
                                    <h3 className={styles.studentName}>{student.name}</h3>
                                    <p className={styles.subText}>पिता: {student.father || 'N/A'}</p>
                                    <p className={styles.subText}>FCC ID: <strong>{student.fcc_id}</strong> | क्लास: <strong>{student.fcc_class || 'N/A'}</strong></p>
                                </div>
                                <div className={styles.feeInfoNew}>
                                    <p>कुल बकाया: <span className={styles.feeRemaining}>₹{student.total_remaining.toFixed(2)}</span></p>
                                    <p>कुल देय: ₹{student.total_due.toFixed(2)}</p>
                                    <p>कुल जमा: ₹{student.total_paid.toFixed(2)}</p>
                                    {student.last_payment_date && <p><Calendar size={14}/> अंतिम भुगतान: {new Date(student.last_payment_date).toLocaleDateString('hi-IN')}</p>}
                                </div>
                            </div>
                            <div className={styles.actionButtons}>
                                <button onClick={() => setViewingStudent(student)} className={`${styles.actionButton} ${styles.editButton}`}>
                                    <ChevronsRight size={16} /> फीस प्रबंधित करें
                                </button>
                                <button onClick={() => handleViewLogsClick(student.fcc_id)} className={`${styles.actionButton} ${styles.logButton}`} title="अपडेट लॉग देखें">
                                    <BookCopy size={16} /> लॉग
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className={styles.centeredMessage}><p>इस फ़िल्टर के साथ कोई विद्यार्थी नहीं मिला।</p></div>
                )}
            </div>

            {/* Monthly Fee Management Modal */}
            {viewingStudent && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.largeModal}`}>
                        <button className={styles.closeButton} onClick={() => { setViewingStudent(null); fetchStudentData(); }}><X size={24} /></button>
                        {modalLoading && <div className={styles.modalLoader}><ClipLoader size={40} /></div>}
                        <h3>{viewingStudent.name} की मासिक फीस</h3>
                        <p className={styles.modalSubHeader}>FCC ID: {viewingStudent.fcc_id} | स्टैंडर्ड फीस: ₹{viewingStudent.standard_monthly_fee || 'N/A'}</p>

                        <details className={styles.addMonthDetails}>
                            <summary><PlusCircle size={16} /> नया महीना मैन्युअल रूप से जोड़ें</summary>
                            <form onSubmit={handleAddMonth} className={styles.addMonthForm}>
                                <input type="month" name="fee_month" required />
                                <input type="number" name="base_fee" placeholder="मूल फीस" defaultValue={viewingStudent.standard_monthly_fee} required />
                                <button type="submit">जोड़ें</button>
                            </form>
                        </details>
                        
                        <div className={styles.monthlyRecordsTableContainer}>
                            <table className={styles.monthlyRecordsTable}>
                                <thead>
                                    <tr>
                                        <th>महीना</th>
                                        <th>देय राशि</th>
                                        <th>छूट</th>
                                        <th>जमा राशि</th>
                                        <th>बकाया</th>
                                        <th>स्थिति</th>
                                        <th>एक्शन</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingStudent.monthly_fee_records.map(record => {
                                        const remainingForMonth = record.final_due_amount - record.amount_paid;
                                        return (
                                            <MonthlyRecordRow 
                                                key={record.id} 
                                                record={record}
                                                remainingForMonth={remainingForMonth}
                                                onMakePayment={handleMakePayment}
                                                onUpdateDiscount={handleUpdateDiscount}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Logs Modal (पुराने कोड से) */}
            {viewingLogsFor && (
                 <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.logsModal}`}>
                        <button className={styles.closeButton} onClick={() => setViewingLogsFor(null)}><X size={24} /></button>
                        <h3>{viewingLogsFor} के फीस लॉग्स</h3>
                        {logsLoading ? <div className={styles.centeredMessage}><ClipLoader size={30} /></div> : (
                            logs.length > 0 ? (
                                <ul className={styles.logList}>
                                    {logs.map(log => (
                                        <li key={log.id} className={styles.logItem}>
                                            <p><strong>तिथि:</strong> {new Date(log.updated_at).toLocaleString('hi-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                            <p><strong>किसने बदला:</strong> {log.updated_by}</p>
                                            <p><strong>नोट्स:</strong> {log.notes || 'कोई नोट नहीं'}</p>
                                            {log.change_details && (
                                                <details className={styles.logDetails}>
                                                    <summary>तकनीकी विवरण देखें</summary>
                                                    <pre>{JSON.stringify(log.change_details, null, 2)}</pre>
                                                </details>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>इस छात्र के लिए कोई लॉग उपलब्ध नहीं है।</p>
                        )}
                    </div>
                 </div>
            )}
        </div>
    );
};

// ====================================================================================
// ===== एक अलग कंपोनेंट टेबल की हर पंक्ति के लिए (कोड को साफ रखने के लिए) =====
// ====================================================================================
const MonthlyRecordRow = ({ record, remainingForMonth, onMakePayment, onUpdateDiscount }) => {
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [showPaymentInput, setShowPaymentInput] = useState(false);
    
    const [discountTag, setDiscountTag] = useState(record.discount_tag || '');
    const [discountAmount, setDiscountAmount] = useState(record.discount_amount || '');
    const [showDiscountInput, setShowDiscountInput] = useState(false);

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        onMakePayment(record, paymentAmount, paymentNotes);
        setShowPaymentInput(false);
        setPaymentAmount('');
        setPaymentNotes('');
    };

    const handleDiscountSubmit = (e) => {
        e.preventDefault();
        onUpdateDiscount(record.id, discountTag, discountAmount);
        setShowDiscountInput(false);
    };

    return (
        <tr className={styles[`status_${record.status}`]}>
            <td>{new Date(record.fee_month).toLocaleString('hi-IN', { month: 'long', year: 'numeric' })}</td>
            <td>₹{record.final_due_amount} <br/><small>(बेस: ₹{record.base_fee})</small></td>
            <td>
                {record.discount_amount > 0 ? `₹${record.discount_amount} (${record.discount_tag || 'छूट'})` : '—'}
                <button onClick={() => setShowDiscountInput(!showDiscountInput)} className={styles.miniButton}><Edit size={12}/></button>
                {showDiscountInput && (
                    <form onSubmit={handleDiscountSubmit} className={styles.inlineForm}>
                        <input type="text" value={discountTag} onChange={e => setDiscountTag(e.target.value)} placeholder="छूट का टैग"/>
                        <input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="छूट राशि"/>
                        <button type="submit">सेव</button>
                    </form>
                )}
            </td>
            <td>₹{record.amount_paid}</td>
            <td className={styles.feeRemaining}>₹{remainingForMonth.toFixed(2)}</td>
            <td><span className={`${styles.statusBadge} ${styles[`badge_${record.status}`]}`}>{record.status}</span></td>
            <td>
                {record.status !== 'paid' && (
                    <>
                        <button onClick={() => setShowPaymentInput(!showPaymentInput)} className={styles.actionButton}>भुगतान</button>
                        {showPaymentInput && (
                            <form onSubmit={handlePaymentSubmit} className={styles.inlineForm}>
                                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="राशि" required/>
                                <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="नोट्स"/>
                                <button type="submit">जमा करें</button>
                            </form>
                        )}
                    </>
                )}
            </td>
        </tr>
    );
};

export default FeeManagementPanel;