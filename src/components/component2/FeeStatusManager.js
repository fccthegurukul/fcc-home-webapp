import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './FeeStatusManager.css';
import { ClipLoader } from 'react-spinners';

const FeeStatusManager = () => {
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const apiUrl = process.env.REACT_APP_API_URL;
    const [editingFccId, setEditingFccId] = useState(null);
    const [updatedTutionFeeStatus, setUpdatedTutionFeeStatus] = useState({});
    const [classes, setClasses] = useState([]);
    const [selectedClassFilter, setSelectedClassFilter] = useState('');
    const [selectedFccIdFilter, setSelectedFccIdFilter] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [bulkUpdateSuccessMessage, setBulkUpdateSuccessMessage] = useState('');
    const [apiError, setApiError] = useState(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkStatusValue, setBulkStatusValue] = useState('true');

    const fetchAllStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        setApiError(null);
        try {
            const response = await axios.get(`${apiUrl}/get-students`, {
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (response.status !== 200) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            setAllStudents(response.data);
            setFilteredStudents(response.data);
        } catch (err) {
            console.error("Error fetching students:", err);
            setError('स्टूडेंट्स लोड करने में विफल। सर्वर रिस्पॉन्स देखें।');
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    const fetchClasses = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/get-classes-list`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            setClasses(['', ...response.data]);
        } catch (err) {
            console.error("Error fetching classes:", err);
            setError('क्लासेस को फ़िल्टर के लिए लोड करने में विफल।');
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchClasses();
        fetchAllStudents();
    }, [fetchClasses, fetchAllStudents]);

    const applyFilters = useCallback(() => {
        let filtered = [...allStudents];
        
        if (selectedClassFilter) {
            filtered = filtered.filter(student => student.fcc_class === selectedClassFilter);
        }
        
        if (selectedFccIdFilter) {
            filtered = filtered.filter(student => 
                (student.fcc_id || '').toLowerCase().includes(selectedFccIdFilter.toLowerCase())
            );
        }
        
        setFilteredStudents(filtered);
    }, [allStudents, selectedClassFilter, selectedFccIdFilter]);

    useEffect(() => {
        applyFilters();
    }, [selectedClassFilter, selectedFccIdFilter, applyFilters]);

    const handleEditStatus = (fccId) => {
        setEditingFccId(fccId);
        const studentToEdit = allStudents.find(student => student.fcc_id === fccId);
        if (studentToEdit) {
            setUpdatedTutionFeeStatus(prevState => ({
                ...prevState,
                [fccId]: studentToEdit.tutionfee_paid
            }));
        }
    };

    const handleStatusChange = (fccId, e) => {
        setUpdatedTutionFeeStatus(prevState => ({
            ...prevState,
            [fccId]: e.target.value === 'true'
        }));
    };

    const handleSaveStatus = async (fccId) => {
        setLoading(true);
        setError('');
        setApiError(null);
        try {
            const statusToUpdate = updatedTutionFeeStatus[fccId];
            const response = await axios.put(`${apiUrl}/update-tutionfee-status/${fccId}`, {
                tutionfee_paid: statusToUpdate
            }, { headers: { "ngrok-skip-browser-warning": "true", 'Content-Type': 'application/json' } });

            if (response.status !== 200) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const updatedStudents = allStudents.map(student => 
                student.fcc_id === fccId ? { ...student, tutionfee_paid: statusToUpdate } : student
            );
            setAllStudents(updatedStudents);
            setFilteredStudents(updatedStudents.filter(student => 
                (!selectedClassFilter || student.fcc_class === selectedClassFilter) &&
                (!selectedFccIdFilter || (student.fcc_id || '').toLowerCase().includes(selectedFccIdFilter.toLowerCase()))
            ));
            setEditingFccId(null);
        } catch (err) {
            console.error("Error updating fee status:", err);
            setError(`फीस स्टेटस FCC ID के लिए अपडेट करने में विफल: ${fccId}. सर्वर रिस्पॉन्स देखें।`);
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingFccId(null);
        setUpdatedTutionFeeStatus({});
    };

    const handleClassFilterChange = (e) => {
        setSelectedClassFilter(e.target.value);
    };

    const handleFccIdFilterChange = (e) => {
        setSelectedFccIdFilter(e.target.value);
    };

    const handleBulkUpdate = async () => {
        if (selectedStudentIds.length === 0) {
            alert("कृपया बल्क अपडेट के लिए कम से कम एक छात्र का चयन करें।");
            return;
        }

        setIsBulkUpdating(true);
        setError('');
        setApiError(null);
        setBulkUpdateSuccessMessage('');
        const updates = selectedStudentIds.map(fccId => ({
            fcc_id: fccId,
            tutionfee_paid: bulkStatusValue === 'true'
        }));

        try {
            const response = await axios.post(`${apiUrl}/bulk-update-tutionfee-status`, updates, {
                headers: { "ngrok-skip-browser-warning": "true", 'Content-Type': 'application/json' }
            });

            if (response.status !== 200) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const updatedStudents = allStudents.map(student => {
                const update = updates.find(u => u.fcc_id === student.fcc_id);
                return update ? { ...student, tutionfee_paid: update.tutionfee_paid } : student;
            });
            setAllStudents(updatedStudents);
            applyFilters();
            setSelectedStudentIds([]);
            setBulkUpdateSuccessMessage(`${selectedStudentIds.length} छात्रों के लिए ट्यूशन शुल्क की स्थिति बल्क अपडेट की गई '${bulkStatusValue === 'true' ? 'बाकी ⏳' : 'जम्मा ✅'}' के रूप में.`);
        } catch (error) {
            console.error("Bulk update error:", error);
            setError("बल्क अपडेट करने में विफल। सर्वर रिस्पॉन्स देखें।");
            setApiError(error.message);
        } finally {
            setIsBulkUpdating(false);
            setLoading(false);
        }
    };

    const handleStudentCheckboxChange = (e, fccId) => {
        if (e.target.checked) {
            setSelectedStudentIds([...selectedStudentIds, fccId]);
        } else {
            setSelectedStudentIds(selectedStudentIds.filter(id => id !== fccId));
        }
    };

    const clearFilters = () => {
        setSelectedClassFilter('');
        setSelectedFccIdFilter('');
    };

    const handleBulkStatusChange = (e) => {
        setBulkStatusValue(e.target.value);
    };

    if (loading) {
        return <div className="loading-container"><ClipLoader color="#007bff" loading={loading} size={50} /> <p>स्टूडेंट्स लोड हो रहे हैं...</p></div>;
    }

    if (error) {
        return <div className="error-container">
            <p>{error}</p>
            {apiError && <p>API Error: {apiError}</p>}
        </div>;
    }

    return (
        <div className="fee-status-manager-container-desktop">
            <h1 className="header-desktop">ट्यूशन फी स्टेटस मैनेजमेंट</h1>

            {selectedStudentIds.length > 0 && (
                <div className="bulk-actions-desktop-top">
                    <div className="bulk-status-selector">
                        <label className="bulk-status-label">बल्क अपडेट स्टेटस सेट करें:</label>
                        <select
                            className="bulk-status-select-desktop"
                            value={bulkStatusValue}
                            onChange={handleBulkStatusChange}
                        >
                            <option value="false">जम्मा ✅</option>
                            <option value="true">बाकी ⏳</option>
                        </select>
                    </div>
                    <button
                        onClick={handleBulkUpdate}
                        className="bulk-update-button-desktop"
                        disabled={isBulkUpdating}
                    >
                        {isBulkUpdating ? 'बल्क अपडेटिंग...' : 'चुने हुए के लिए स्टेटस अपडेट करें'}
                    </button>
                    <p>{selectedStudentIds.length} छात्र चुने गए</p>
                    {bulkUpdateSuccessMessage && <p className="bulk-success-message">{bulkUpdateSuccessMessage}</p>}
                </div>
            )}

            <div className="filters-desktop">
                <label htmlFor="classFilter" className="filter-label-desktop">क्लास फ़िल्टर:</label>
                <select
                    id="classFilter"
                    className="filter-select-desktop"
                    value={selectedClassFilter}
                    onChange={handleClassFilterChange}
                >
                    <option value="">सभी क्लासेस</option>
                    {classes.map(className => (
                        <option key={className} value={className}>{className}</option>
                    ))}
                </select>

                <label htmlFor="fccIdFilter" className="filter-label-desktop">FCC ID फ़िल्टर:</label>
                <input
                    id="fccIdFilter"
                    type="text"
                    className="filter-input-desktop"
                    value={selectedFccIdFilter}
                    onChange={handleFccIdFilterChange}
                    placeholder="FCC ID डालें"
                />

                <button onClick={clearFilters} className="filter-button-desktop">फ़िल्टर हटाएं</button>
            </div>

            <table className="students-table-desktop">
                <thead>
                    <tr>
                        <th>चुनें</th>
                        <th>नाम</th>
                        <th>FCC ID</th>
                        <th>क्लास</th>
                        <th>ट्यूशन शुल्क भुगतान स्थिति</th>
                        <th>कार्रवाई</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map(student => (
                        <tr key={student.fcc_id}>
                            <td>
                                <input
                                    type="checkbox"
                                    onChange={(e) => handleStudentCheckboxChange(e, student.fcc_id)}
                                    aria-label={`${student.name} को बल्क एक्शन के लिए चुनें`}
                                />
                            </td>
                            <td>{student.name}</td>
                            <td>{student.fcc_id}</td>
                            <td>{student.fcc_class}</td>
                            <td>
                                {editingFccId === student.fcc_id ? (
                                    <select
                                        className="status-select-desktop"
                                        value={updatedTutionFeeStatus[student.fcc_id] === true ? 'true' : 'false'}
                                        onChange={(e) => handleStatusChange(student.fcc_id, e)}
                                    >
                                        <option value="false">जम्मा ✅</option>
                                        <option value="true">बाकी ⏳</option>
                                    </select>
                                ) : (
                                    student.tutionfee_paid ? "बाकी ⏳" : "जम्मा ✅"
                                )}
                            </td>
                            <td>
                                {editingFccId === student.fcc_id ? (
                                    <div className="action-buttons-desktop">
                                        <button onClick={() => handleSaveStatus(student.fcc_id)} className="save-button-desktop">सेव करें</button>
                                        <button onClick={handleCancelEdit} className="cancel-button-desktop">रद्द करें</button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditStatus(student.fcc_id)} className="edit-button-desktop">स्थिति संपादित करें</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FeeStatusManager;