import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { ApiKeysModal } from './ApiKeysModal';

export default function ApiKeysButton() {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                className="btn btn-ghost gap-2"
                onClick={() => setShowModal(true)}
                title="API Keys Settings"
            >
                <SettingsIcon fontSize="small" />
                <span className="hidden md:inline">API Keys</span>
            </button>
            <ApiKeysModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </>
    );
}
