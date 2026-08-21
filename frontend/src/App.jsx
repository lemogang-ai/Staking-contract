import Navbar from './components/Navbar.jsx';
import './App.css';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <div className="hero">
          <h1>Your Blockchain Project</h1>
          <p className="subtitle">Scaffolded by Africa's Blockchain Club</p>
        </div>
      </main>
    </div>
  );
}

export default App;
