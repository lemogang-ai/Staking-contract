import Navbar from './components/Navbar.jsx';
import StakingApp from './components/StakingApp.jsx';
import { WalletProvider } from './context/WalletContext.jsx';
import './App.css';

function App() {
  return (
    <WalletProvider>
      <div className="app">
        <Navbar />
        <main className="main">
          <StakingApp />
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;