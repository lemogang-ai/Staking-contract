import { useWallet } from '../context/WalletContext.jsx';
import './Navbar.css';

export default function Navbar() {
  const { account, connecting, connectWallet } = useWallet();

  function truncate(addr) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🔗</span>
        <span className="navbar-title">Staking Protocol</span>
      </div>

      <div className="navbar-actions">
        {account ? (
          <div className="wallet-badge">
            <span className="wallet-dot" />
            <span className="wallet-address">{truncate(account)}</span>
          </div>
        ) : (
          <button
            className="connect-btn"
            onClick={connectWallet}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
}
