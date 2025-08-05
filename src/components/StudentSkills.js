import React, { useState, useEffect } from 'react';
import styles from './StudentProfile.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

// स्टेटस टैग के लिए हेल्पर कंपोनेंट
const StatusTag = ({ level }) => {
    const statusClass = `status${level?.replace(/\s+/g, '') || 'Unknown'}`;
    return (
        <span className={`${styles.status} ${styles[statusClass]}`}>
            {level || 'N/A'}
        </span>
    );
};

// logActivity और studentFccId को props के रूप में स्वीकार करें
const StudentSkills = ({ targets, isLoading, logActivity, studentFccId }) => {
    const [openAccordions, setOpenAccordions] = useState(new Set());
    const [showAllSkills, setShowAllSkills] = useState(false);

    // यह हुक डिफ़ॉल्ट रूप से "Not Started" वाले विषयों को खोलने के लिए है
    useEffect(() => {
        if (targets && targets.length > 0) {
            const defaultOpenIds = new Set();
            targets.forEach(target => {
                if (target.proficiency_level === 'Not Started') {
                    defaultOpenIds.add(target.target_id);
                }
            });
            setOpenAccordions(defaultOpenIds);
        }
    }, [targets]);

    const handleAccordionToggle = (targetId, targetName) => {
        const isOpen = openAccordions.has(targetId);
        logActivity('Toggle Skill Accordion', { 
            fcc_id: studentFccId, 
            target_id: targetId, 
            target_name: targetName, 
            action: isOpen ? 'close' : 'open' 
        });

        setOpenAccordions(prevOpen => {
            const newOpen = new Set(prevOpen);
            isOpen ? newOpen.delete(targetId) : newOpen.add(targetId);
            return newOpen;
        });
    };

    const handleViewMoreClick = () => {
        logActivity('Click View More Skills', { fcc_id: studentFccId });
        setShowAllSkills(true);
    };

    if (isLoading) {
        return <div className={styles.loaderText}>स्किल रिपोर्ट लोड हो रही है...</div>;
    }

    if (!targets || targets.length === 0) {
        return <p className={styles.noDataText}>इस छात्र के लिए कोई स्किल डेटा मौजूद नहीं है।</p>;
    }
    
    // "Not Started" विषयों को ऊपर लाने के लिए सॉर्टिंग
    const sortedTargets = [...targets].sort((a, b) => {
        const isANotStarted = a.proficiency_level === 'Not Started';
        const isBNotStarted = b.proficiency_level === 'Not Started';
        if (isANotStarted && !isBNotStarted) return -1;
        if (!isANotStarted && isBNotStarted) return 1;
        return 0;
    });

    const skillsToShow = showAllSkills ? sortedTargets : sortedTargets.slice(0, 5);

    return (
        <div className={styles.skillsSection}>
            <h3 className={styles.skillsHeader}>स्किल रिपोर्ट</h3>
            <div className={styles.accordionContainer}>
                {skillsToShow.map(target => {
                    const hasSubTopics = target.sub_topics && target.sub_topics.length > 0;
                    const hasTests = target.tests && target.tests.length > 0;
                    
                    // अगर विषय शुरू नहीं हुआ है लेकिन उसमें उप-विषय हैं, तो उसे 'Studying' दिखाएं
                    const displayStatus = target.proficiency_level === 'Not Started' && hasSubTopics
                        ? 'Studying'
                        : target.proficiency_level;
                    
                    const isAccordionOpen = openAccordions.has(target.target_id);

                    return (
                        <div className={styles.accordionItem} key={target.target_id}>
                            <div className={styles.accordionTitle} onClick={() => handleAccordionToggle(target.target_id, target.target_name)}>
                                <span className={styles.targetName}>{target.target_name} ({target.subject})</span>
                                <div className={styles.statusAndArrow}>
                                    <StatusTag level={displayStatus} />
                                    <FontAwesomeIcon
                                        icon={faChevronRight}
                                        className={`${styles.accordionArrow} ${isAccordionOpen ? styles.open : ''}`}
                                    />
                                </div>
                            </div>
                            <div 
                                className={`${styles.accordionContent} ${isAccordionOpen ? styles.openContent : ''}`}
                            >
                                {/* उप-विषय सेक्शन */}
                                <div className={styles.contentSection}>
                                    <h4>पढ़े गए उप-विषय (Sub-Topics)</h4>
                                    {hasSubTopics ? (
                                        <ul className={styles.detailsList}>
                                            {target.sub_topics.map((sub, index) => (
                                                <li key={index}>
                                                    » {sub.sub_topic} - 
                                                    <span className={sub.proficiency_level?.includes('Missed') ? styles.statusMissed : ''}>
                                                        {' '}{sub.proficiency_level}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className={styles.noDataTextSmall}>अभी तक कोई उप-विषय कवर नहीं किया गया है।</p>}
                                </div>
                                
                                {/* टेस्ट प्रदर्शन सेक्शन */}
                                <div className={styles.contentSection}>
                                    <h4>टेस्ट और प्रदर्शन (Tests & Performance)</h4>
                                    {hasTests ? (
                                         <ul className={styles.detailsList}>
                                             {target.tests.map(test => (
                                                 <li key={test.test_id}>
                                                     {test.test_name}: 
                                                     <strong> {test.score_obtained} / {test.max_marks} </strong>
                                                     (<StatusTag level={test.proficiency_tag} />)
                                                 </li>
                                             ))}
                                         </ul>
                                    ) : <p className={styles.noDataTextSmall}>इस विषय पर अभी कोई टेस्ट नहीं हुआ है।</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {sortedTargets.length > 5 && !showAllSkills && (
                <button className={styles.viewMoreButton} onClick={handleViewMoreClick}>
                    और देखें
                </button>
            )}
        </div>
    );
};

export default StudentSkills;