import React, { useState } from 'react';
import CreateTestForm from './CreateTestForm'; // <-- COMMENT
import LiveTests from './LiveTests';         // <-- COMMENT
import GradeTest from './GradeTest';         // <-- COMMENT
import './TestManagement.css'; 

const TestManagementPanel = ({ user }) => {
    const [activeTab, setActiveTab] = useState('create');

  const renderContent = () => {
        switch (activeTab) {
            case 'create':
                return <CreateTestForm user={user} />;
            case 'live':
                return <LiveTests user={user} />;
            case 'grade':
                return <GradeTest user={user} />;
            default:
                return <CreateTestForm user={user} />;
        }
    };


    return (
        <div className="test-panel-container">
            <div className="tabs">
                <button onClick={() => setActiveTab('create')} className={activeTab === 'create' ? 'active' : ''}>Create Test</button>
                <button onClick={() => setActiveTab('live')} className={activeTab === 'live' ? 'active' : ''}>Conduct Test</button>
                <button onClick={() => setActiveTab('grade')} className={activeTab === 'grade' ? 'active' : ''}>Grade Tests</button>
            </div>
            <div className="tab-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default TestManagementPanel;