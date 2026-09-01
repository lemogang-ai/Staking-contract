import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install it at https://metamask.io');
      return;
    }

    setConnecting(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      setProvider(browserProvider);
      setAccount(accounts[0]);
    } catch (err) {
      console.error('Wallet connection rejected:', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  // Keep account in sync if the user switches accounts in MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      setAccount(accounts.length ? accounts[0] : null);
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }, []);

  return (
    <WalletContext.Provider value={{ account, provider, connecting, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
