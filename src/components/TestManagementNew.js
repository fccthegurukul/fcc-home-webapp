import React, { useState } from 'react';
import CreateTestForm from './../components/TestManagement/CreateTestForm';
import LiveTests from './../components/TestManagement/LiveTests';
import GradeTest from './../components/TestManagement/GradeTest';
import './TestManagement.css'; // CSS import karein

const TestManagementNew  = ({ user }) => {
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

export default TestManagementNew ;