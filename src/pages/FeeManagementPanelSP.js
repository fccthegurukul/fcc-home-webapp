// FeeManagementPanel.js

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { generateFeeReceiptPDF } from '../utils/generateReceipt';
import styles from './FeeManagementPanel.module.css';
import { Edit, BookCopy, Filter, X, Search, Calendar, Tag, RefreshCw } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

const FeeManagementPanel = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    // Filters State
    const [filters, setFilters] = useState({ status: 'all', class: 'all', search: '' });
    const [availableClasses, setAvailableClasses] = useState([]);

    // Modal State for Editing
    const [editingStudent, setEditingStudent] = useState(null);
    const [feeFormData, setFeeFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Modal State for Logs
    const [viewingLogsFor, setViewingLogsFor] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const fetchStudentData = async () => {
        setLoading(true);
        setError('');
        const { data, error } = await supabase
            .from('new_student_admission')
            .select(`
                id, name, father, mobile_number, schooling_class, fcc_class, fcc_id, tutionfee_paid,
                tuition_fee_details(*)
            `)
            .order('name', { ascending: true });

        if (error) {
            setError('डेटा लोड करने में त्रुटि हुई: ' + error.message);
        } else {
            setStudents(data || []);
            const uniqueClasses = [...new Set((data || []).map(s => s.fcc_class).filter(Boolean))].sort();
            setAvailableClasses(uniqueClasses);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStudentData();
    }, []);

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const statusMatch = filters.status === 'all' ||
                                (filters.status === 'baaki' && student.tutionfee_paid === true) ||
                                (filters.status === 'jamma' && student.tutionfee_paid === false);
            const classMatch = filters.class === 'all' || student.fcc_class === filters.class;
            const searchMatch = !filters.search ||
                                student.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                                (student.father && student.father.toLowerCase().includes(filters.search.toLowerCase())) ||
                                (student.fcc_id && student.fcc_id.toLowerCase().includes(filters.search.toLowerCase()));
            return statusMatch && classMatch && searchMatch;
        });
    }, [students, filters]);

    // Open edit modal and initialize form data
    const handleEditClick = (student) => {
        const feeDetails = (student.tuition_fee_details && student.tuition_fee_details[0]) || {};
        setEditingStudent(student);
        setFeeFormData({
            total_fee: feeDetails.total_fee || '',
            fee_remaining: feeDetails.fee_remaining || '',
            due_date: feeDetails.due_date || '',
            offer_price: feeDetails.offer_price || '',
            offer_valid_till: feeDetails.offer_valid_till || '',
            amount_paid_now: '',
            notes: '',
        });
    };

    // Update pending amount as user enters paid amount
    const handleAmountChange = (e) => {
        const amountPaid = parseFloat(e.target.value) || 0;
        const originalRemaining = parseFloat((editingStudent.tuition_fee_details && editingStudent.tuition_fee_details[0])?.fee_remaining) || parseFloat(feeFormData.total_fee) || 0;
        const newRemaining = originalRemaining - amountPaid;

        setFeeFormData({
            ...feeFormData,
            amount_paid_now: e.target.value,
            fee_remaining: newRemaining >= 0 ? newRemaining.toString() : '0',
        });
    };

    // Save fee updates, log changes, and optionally generate receipt
    const handleFeeUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const amountPaidNow = parseFloat(feeFormData.amount_paid_now) || 0;
        const originalFeeDetails = (editingStudent.tuition_fee_details && editingStudent.tuition_fee_details[0]) || {};
        const feeRemaining = parseFloat(feeFormData.fee_remaining) || 0;
        const totalFee = parseFloat(feeFormData.total_fee) || feeRemaining;

        // Step 1: Upsert fee details
        const { error: upsertError } = await supabase.from('tuition_fee_details').upsert(
            {
                fcc_id: editingStudent.fcc_id,
                class: editingStudent.fcc_class,
                total_fee: totalFee,
                fee_remaining: feeRemaining,
                fee_paid: totalFee - feeRemaining,
                due_date: feeFormData.due_date || null,
                offer_price: feeFormData.offer_price || null,
                offer_valid_till: feeFormData.offer_valid_till || null,
            },
            { onConflict: 'fcc_id' }
        );

        if (upsertError) {
            alert('फीस अपडेट करने में त्रुटि: ' + upsertError.message);
            setIsSaving(false);
            return;
        }

        // Step 2: Update student status
        await supabase
            .from('new_student_admission')
            .update({ tutionfee_paid: feeRemaining > 0 })
            .eq('id', editingStudent.id);

        // Step 3: Log the change
        await supabase.from('fee_update_logs').insert({
            fcc_id: editingStudent.fcc_id,
            updated_by: 'Admin',
            change_details: {
                before: originalFeeDetails,
                after: { ...feeFormData },
            },
            notes: feeFormData.notes,
        });

        // Step 4: Receipt generation & Logging
        if (amountPaidNow > 0) {
            try {
                const receiptDetails = await generateFeeReceiptPDF(
                    editingStudent,
                    feeFormData,
                    amountPaidNow,
                    feeFormData.notes
                );

                if (receiptDetails.success) {
                    const { error: receiptLogError } = await supabase
                        .from('fee_receipts')
                        .insert({
                            receipt_no: receiptDetails.receiptNo,
                            fcc_id: editingStudent.fcc_id,
                            student_name: editingStudent.name,
                            amount_paid: receiptDetails.amountPaid,
                            amount_in_words: receiptDetails.amountInWords,
                            payment_date: receiptDetails.paymentDate,
                            pdf_filename: receiptDetails.fileName,
                            generated_by: 'Admin',
                            notes: feeFormData.notes,
                        });

                    if (receiptLogError) {
                        console.error('रसीद रिकॉर्ड सेव करने में त्रुटि:', receiptLogError.message);
                        alert('फीस अपडेट हुई, रसीद बनी पर रिकॉर्ड सेव नहीं हो सका।');
                    } else {
                        alert('फीस सफलतापूर्वक अपडेट हुई और रसीद डाउनलोड हो गई है!');
                    }
                }
            } catch (pdfError) {
                console.error('PDF बनाने में त्रुटि:', pdfError);
                alert('फीस अपडेट हुई, लेकिन रसीद बनाने में समस्या हुई।');
            }
        } else {
            alert('फीस सफलतापूर्वक अपडेट हो गई है!');
        }

        setIsSaving(false);
        setEditingStudent(null);
        fetchStudentData();
    };

    // View change logs
    const handleViewLogsClick = async (fcc_id) => {
        setViewingLogsFor(fcc_id);
        setLogsLoading(true);
        const { data, error } = await supabase
            .from('fee_update_logs')
            .select('*')
            .eq('fcc_id', fcc_id)
            .order('updated_at', { ascending: false });

        if (error) alert('लॉग्स लोड करने में त्रुटि: ' + error.message);
        else setLogs(data || []);
        setLogsLoading(false);
    };

    // Quick toggle fee status
    const handleQuickStatusChange = async (student) => {
        const newStatus = !student.tutionfee_paid;
        if (window.confirm(`क्या आप ${student.name} की स्थिति बदलना चाहते हैं?`)) {
            setUpdatingStatusId(student.id);
            const { error } = await supabase
                .from('new_student_admission')
                .update({ tutionfee_paid: newStatus })
                .eq('id', student.id);
            if (error) alert('स्थिति अपडेट में त्रुटि: ' + error.message);
            else {
                await supabase.from('fee_update_logs').insert({
                    fcc_id: student.fcc_id,
                    updated_by: 'Admin',
                    notes: `त्वरित स्थिति परिवर्तन: ${student.tutionfee_paid ? 'बाकी→जम्मा' : 'जम्मा→बाकी'}`
                });
                alert('स्थिति सफलतापूर्वक बदल दी गई है!');
                fetchStudentData();
            }
            setUpdatingStatusId(null);
        }
    };

    if (loading) return <div className={styles.centeredMessage}><ClipLoader size={50} /> <p>डेटा लोड हो रहा है...</p></div>;
    if (error) return <div className={styles.centeredMessage}><p className={styles.errorText}>{error}</p></div>;

    return (
        <div className={styles.panelContainer}>
            <header className={styles.panelHeader}>
                <h1>शुल्क प्रबंधन पैनल</h1>
                <p>विद्यार्थियों की फीस की स्थिति देखें और प्रबंधित करें।</p>
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
                    const feeDetails = (student.tuition_fee_details && student.tuition_fee_details[0]);
                    const statusClass = student.tutionfee_paid ? styles.statusBaaki : styles.statusJamma;
                    return (
                        <div key={student.id} className={`${styles.studentCard} ${statusClass}`}>
                            <div className={styles.cardContent}>
                                <div className={styles.studentInfo}>
                                    <h3 className={styles.studentName}>{student.name}</h3>
                                    <p className={styles.subText}>पिता: {student.father || 'N/A'}</p>
                                    <p className={styles.subText}>FCC ID: <strong>{student.fcc_id}</strong> | संपर्क: {student.mobile_number || 'N/A'}</p>
                                    <p className={styles.subText}>कक्षा (कोचिंग): <strong>{student.fcc_class || 'N/A'}</strong></p>
                                </div>
                                
                                <div className={styles.feeInfo}>
                                    {student.tutionfee_paid ? (
                                        feeDetails ? (
                                            <>
                                                <span className={`${styles.statusBadge} ${styles.badgeBaaki}`}>बाकी</span>
                                                <div className={styles.feeDetailsBlock}>
                                                    {/* यहाँ है आपका समाधान! */}
                                                    <p><strong>कुल फीस:</strong> ₹{feeDetails.total_fee || 'N/A'}</p>
                                                    <p className={styles.feeRemaining}><strong>बकाया:</strong> ₹{feeDetails.fee_remaining}</p>
                                                    {feeDetails.due_date && <p><Calendar size={14} /> <strong>देय तिथि:</strong> {new Date(feeDetails.due_date).toLocaleDateString('hi-IN')}</p>}
                                                    {feeDetails.offer_price && <p className={styles.offerText}><Tag size={14} /> <strong>ऑफर:</strong> ₹{feeDetails.offer_price} ({new Date(feeDetails.offer_valid_till).toLocaleDateString('hi-IN')} तक)</p>}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={styles.noDetails}>
                                                <span className={`${styles.statusBadge} ${styles.badgeBaaki}`}>बाकी</span>
                                                <p>विवरण उपलब्ध नहीं</p>
                                            </div>
                                        )
                                    ) : (
                                        <span className={`${styles.statusBadge} ${styles.badgeJamma}`}>जम्मा</span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.actionButtons}>
                                <button onClick={() => handleEditClick(student)} className={`${styles.actionButton} ${styles.editButton}`} title="विवरण संपादित करें">
                                    <Edit size={16} /> संपादित करें
                                </button>
                                <button onClick={() => handleQuickStatusChange(student)} className={`${styles.actionButton} ${styles.statusButton}`} title="स्थिति बदलें" disabled={updatingStatusId === student.id}>
                                    {updatingStatusId === student.id ? <ClipLoader size={16} color="#fff" /> : <><RefreshCw size={16} /> स्थिति</>}
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

        {editingStudent && (
    <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
            <button className={styles.closeButton} onClick={() => setEditingStudent(null)}>
                <X size={24} />
            </button>
            <h3>{editingStudent.name} की फीस संपादित करें</h3>
            <p className={styles.modalSubHeader}>FCC ID: {editingStudent.fcc_id} | क्लास: {editingStudent.fcc_class}</p>

            <form onSubmit={handleFeeUpdate} className={styles.modalForm}>
                <div className={styles.formGrid}>

                    <div className={styles.formGroup}>
                        <label>कुल निर्धारित फीस (Total)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="जैसे: 10000"
                            value={feeFormData.total_fee}
                            onChange={e => setFeeFormData({ ...feeFormData, total_fee: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>अभी जमा की गई राशि (Amount Paid Now)</label>
                        <input
                            type="number"
                            placeholder="जैसे: 2000"
                            value={feeFormData.amount_paid_now}
                            onChange={handleAmountChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>बकाया राशि (Pending)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={feeFormData.fee_remaining}
                            readOnly
                            style={{ backgroundColor: '#e9ecef' }}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>देय तिथि</label>
                        <input
                            type="date"
                            value={feeFormData.due_date}
                            onChange={e => setFeeFormData({ ...feeFormData, due_date: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>ऑफर प्राइस (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="यदि कोई ऑफर है"
                            value={feeFormData.offer_price}
                            onChange={e => setFeeFormData({ ...feeFormData, offer_price: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>ऑफर की अंतिम तिथि</label>
                        <input
                            type="date"
                            value={feeFormData.offer_valid_till}
                            onChange={e => setFeeFormData({ ...feeFormData, offer_valid_till: e.target.value })}
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label>नोट्स (यह लॉग और रसीद में सेव होगा)</label>
                    <textarea
                        placeholder="जैसे: ₹2000 नकद भुगतान प्राप्त हुआ"
                        value={feeFormData.notes}
                        onChange={e => setFeeFormData({ ...feeFormData, notes: e.target.value })}
                        required
                    ></textarea>
                </div>

                <button type="submit" className={styles.saveButton} disabled={isSaving}>
                    {isSaving ? <ClipLoader size={20} color={"#fff"} /> : 'अपडेट सेव करें और रसीद बनाएँ'}
                </button>
            </form>
        </div>
    </div>
)}

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

export default FeeManagementPanel;