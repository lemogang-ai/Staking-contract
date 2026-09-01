import { useState, useEffect, useCallback } from 'react';
import { Contract, formatUnits, parseUnits } from 'ethers';
import { useWallet } from '../context/WalletContext.jsx';
import {
  STAKING_CONTRACT_ADDRESS,
  STAKING_TOKEN_ADDRESS,
  STAKING_ABI,
  ERC20_ABI,
} from '../config/contracts.js';
import './StakingApp.css';

export default function StakingApp() {
  const { account, provider } = useWallet();

  const [decimals, setDecimals] = useState(18);
  const [symbol, setSymbol] = useState('TOKEN');
  const [walletBalance, setWalletBalance] = useState('0');
  const [staked, setStaked] = useState('0');
  const [earned, setEarned] = useState('0');
  const [unlockAt, setUnlockAt] = useState(0);
  const [lockDuration, setLockDuration] = useState(0);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(null); // 'stake' | 'withdraw' | 'claim' | null
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const configured =
    STAKING_CONTRACT_ADDRESS.startsWith('0x') &&
    STAKING_CONTRACT_ADDRESS.length === 42 &&
    STAKING_TOKEN_ADDRESS.startsWith('0x') &&
    STAKING_TOKEN_ADDRESS.length === 42;

  // Tick the clock for the lock countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!provider || !account || !configured) return;
    try {
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      const token = new Contract(STAKING_TOKEN_ADDRESS, ERC20_ABI, provider);

      const [dec, sym, bal, stakedBal, earnedBal, stakeTs, lock] = await Promise.all([
        token.decimals(),
        token.symbol(),
        token.balanceOf(account),
        staking.balanceOf(account),
        staking.earned(account),
        staking.stakeTime(account),
        staking.lockDuration(),
      ]);

      setDecimals(dec);
      setSymbol(sym);
      setWalletBalance(formatUnits(bal, dec));
      setStaked(formatUnits(stakedBal, dec));
      setEarned(formatUnits(earnedBal, dec));
      setLockDuration(Number(lock));
      setUnlockAt(Number(stakeTs) === 0 ? 0 : Number(stakeTs) + Number(lock));
    } catch (err) {
      console.error('Failed to load staking data:', err);
    }
  }, [provider, account, configured]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleStake() {
    if (!provider || !amount || Number(amount) <= 0) return;
    setBusy('stake');
    setStatus('');
    try {
      const signer = await provider.getSigner();
      const token = new Contract(STAKING_TOKEN_ADDRESS, ERC20_ABI, signer);
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
      const value = parseUnits(amount, decimals);

      const allowance = await token.allowance(account, STAKING_CONTRACT_ADDRESS);
      if (allowance < value) {
        setStatus('Approving token spend…');
        const approveTx = await token.approve(STAKING_CONTRACT_ADDRESS, value);
        await approveTx.wait();
      }

      setStatus('Staking…');
      const tx = await staking.stake(value);
      await tx.wait();

      setStatus('Staked successfully.');
      setAmount('');
      await refresh();
    } catch (err) {
      console.error(err);
      setStatus(err?.shortMessage || err?.message || 'Stake failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdraw() {
    if (!provider || !amount || Number(amount) <= 0) return;
    setBusy('withdraw');
    setStatus('');
    try {
      const signer = await provider.getSigner();
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
      const value = parseUnits(amount, decimals);

      setStatus('Withdrawing…');
      const tx = await staking.withdraw(value);
      await tx.wait();

      setStatus('Withdrawn successfully (10% fee applied).');
      setAmount('');
      await refresh();
    } catch (err) {
      console.error(err);
      setStatus(err?.shortMessage || err?.message || 'Withdraw failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleClaim() {
    if (!provider) return;
    setBusy('claim');
    setStatus('');
    try {
      const signer = await provider.getSigner();
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);

      setStatus('Claiming rewards…');
      const tx = await staking.getReward();
      await tx.wait();

      setStatus('Rewards claimed.');
      await refresh();
    } catch (err) {
      console.error(err);
      setStatus(err?.shortMessage || err?.message || 'Claim failed.');
    } finally {
      setBusy(null);
    }
  }

  if (!configured) {
    return (
      <div className="staking-card staking-card--empty">
        <p>
          Set <code>STAKING_CONTRACT_ADDRESS</code> and <code>STAKING_TOKEN_ADDRESS</code> in{' '}
          <code>src/config/contracts.js</code> after deploying.
        </p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="staking-card staking-card--empty">
        <p>Connect your wallet to stake {symbol}.</p>
      </div>
    );
  }

  const locked = unlockAt > now;
  const secondsLeft = locked ? unlockAt - now : 0;
  const lockProgress =
    lockDuration > 0 && locked ? Math.max(0, Math.min(1, 1 - secondsLeft / lockDuration)) : 1;

  return (
    <div className="staking-card">
      <div className="staking-stats">
        <div className="stat">
          <span className="stat-label">Wallet</span>
          <span className="stat-value">{formatAmount(walletBalance, 4)} {symbol}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Staked</span>
          <span className="stat-value">{formatAmount(staked, 4)} {symbol}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Rewards</span>
          <span className="stat-value stat-value--accent">{formatAmount(earned, 6)} {symbol}</span>
        </div>
      </div>

      <div className="lock-track" aria-hidden="true">
        <div className="lock-fill" style={{ width: `${lockProgress * 100}%` }} />
      </div>
      <p className="lock-label">
        {Number(staked) === 0
          ? 'Nothing staked yet.'
          : locked
          ? `Locked — unlocks in ${formatDuration(secondsLeft)}`
          : 'Unlocked — withdraw anytime.'}
      </p>

      <div className="staking-input-row">
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy !== null}
        />
        <button className="max-btn" onClick={() => setAmount(walletBalance)} disabled={busy !== null}>
          Max
        </button>
      </div>

      <div className="staking-actions">
        <button className="action-btn action-btn--primary" onClick={handleStake} disabled={busy !== null}>
          {busy === 'stake' ? 'Staking…' : 'Stake'}
        </button>
        <button
          className="action-btn"
          onClick={handleWithdraw}
          disabled={busy !== null || locked || Number(staked) === 0}
        >
          {busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}
        </button>
        <button
          className="action-btn action-btn--accent"
          onClick={handleClaim}
          disabled={busy !== null || Number(earned) === 0}
        >
          {busy === 'claim' ? 'Claiming…' : 'Claim'}
        </button>
      </div>

      {status && <p className="staking-status">{status}</p>}
      <p className="fee-note">Withdrawals include a 10% protocol fee.</p>
    </div>
  );
}

function formatAmount(value, maxDecimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  });
}

function formatDuration(totalSeconds) {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}