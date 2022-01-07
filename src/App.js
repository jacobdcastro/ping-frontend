import * as React from 'react';
import { ethers } from 'ethers';
import PingPortal from './utils/PingPortal.json';
import './App.css';

export default function App() {
  const [loading, setLoading] = React.useState(false);
  const [activeAccount, setActiveAccount] = React.useState('');
  const [allPings, setAllPings] = React.useState([]);
  const [message, setMessage] = React.useState('');

  const contractAddress = '0x214d8D01441c940585126752649AbCa64eDa16b6';
  const contractABI = PingPortal.abi;

  const initWalletConnection = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log('Must install Metamask!');
        return;
      } else {
        console.log('We have ethereum!', ethereum);
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length > 0) {
        const account = accounts[0];
        console.log('Connected Account:', account);
        setActiveAccount(account);
        await getAllPings();
      } else {
        console.log('No connected account found');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log('Must install Metamask!');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      console.log('connected', accounts[0]);
      setActiveAccount(accounts[0]);
    } catch (error) {}
  };

  React.useEffect(() => {
    initWalletConnection();
  }, [initWalletConnection]);

  //listen for emitter events
  React.useEffect(() => {
    let pingPortalContract;

    const onNewPing = (from, timestamp, message) => {
      console.log('NewPing', from, timestamp, message);
      setAllPings(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      const signer = provider.getSigner();

      pingPortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      pingPortalContract.on('NewPing', onNewPing);
    }

    return () => {
      if (pingPortalContract) {
        pingPortalContract.off('NewPing', onNewPing);
      }
    };
  }, []);

  const getAllPings = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const pingPortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        const pings = await pingPortalContract.getAllPings();

        console.log(pings[0]);

        // remove obj fields we don't need
        let pingsCleaned = pings.map(ping => ({
          address: ping.pinger,
          timestamp: new Date(ping.timestamp * 1000),
          message: ping.message,
          isWinner: ping.isWinner,
        }));

        console.log({ pingsCleaned });

        setAllPings(pingsCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const ping = async () => {
    setLoading(true);
    try {
      const { ethereum } = window;

      if (ethereum) {
        if (message.length > 0) {
          const provider = new ethers.providers.Web3Provider(ethereum);
          const signer = provider.getSigner();
          const pingPortalContract = new ethers.Contract(
            contractAddress,
            contractABI,
            signer
          );

          let count = await pingPortalContract.getTotalPings();
          console.log('Retrieved total ping count...', count.toNumber());

          /*
           * Execute the actual ping from your smart contract
           */
          const pingTxn = await pingPortalContract.ping(message, {
            gasLimit: 300000,
          });
          console.log('Mining...', pingTxn.hash);

          await pingTxn.wait();
          console.log('Mined -- ', pingTxn.hash);

          count = await pingPortalContract.getTotalPings();
          console.log('Retrieved total ping count...', count.toNumber());

          await getAllPings();
          setMessage('');
          setLoading(false);
        } else {
          setLoading(false);
          console.warn('Please write a message!');
        }
      } else {
        setLoading(false);
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  return (
    <div className='mainContainer'>
      <div className='dataContainer'>
        <div className='header'>♟ Rinkeby Ping Contest ♟</div>
        <p>
          This is the really cool portal to "ping" a smart contract. If you
          ping, you have a 25% chance to win some prize money! 0.001 ETH (on
          rinkeby) to be exact...
        </p>
        <p>
          Also, you must wait 1 minute between pings. Can't let you spam my
          contract for the moneys.
        </p>
        <p>
          <b>Must be on Rinkeby network!</b>
        </p>
        <p>
          Written by{' '}
          <a href='https://twitter.com/jacobdcastro'>@jacobdcastro</a>.
        </p>
        <p>
          <a href={`https://rinkeby.etherscan.io/address/${contractAddress}`}>
            View contract on etherscan
          </a>{' '}
          (Deployed to Rinkeby)
          <br />
          <a href='https://github.com/jacobdcastro/rinkeby'>
            View code on Github
          </a>
        </p>
        {!activeAccount && (
          <>
            <p>Connect Your Wallet First!</p>
            <button className='pingButton' onClick={connectWallet}>
              Connect Wallet
            </button>
          </>
        )}

        <h2 style={{ textAlign: 'center' }}>Ping the Contract</h2>
        <input
          style={{ padding: '8px' }}
          onChange={e => setMessage(e.target.value)}
          value={message}
          placeholder='Please write your message to ping'
        />
        <button className='pingButton' onClick={ping}>
          {loading ? 'Awaiting Ping Confirmation...' : 'Send Ping'}
        </button>

        <h2 style={{ textAlign: 'center' }}>
          All Previous Pings ({allPings.length})
        </h2>

        {allPings.map((ping, index) => {
          return (
            <div
              key={index}
              style={{
                backgroundColor: ping.isWinner ? 'lightgreen' : 'OldLace',
                marginTop: '16px',
                padding: '8px',
              }}
            >
              {ping.isWinner && 'This ping won prize money!'}
              <div>Address: {ping.address}</div>
              <div>Time: {ping.timestamp.toString()}</div>
              <div>Message: {ping.message}</div>
              {/* <div>Winner: {ping.isWinner.toString()}</div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
