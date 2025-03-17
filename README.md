# @inscrib3/react
A React library for integrating Inscrib3 functionality into your web applications, providing a custom hook for managing Bitcoin wallet connections and Ordinals drops.

## Installation

```bash
npm install @inscrib3/react
```

## Quick Start

```jsx
import React, { useState, useEffect } from 'react';
import useSdk from '@inscrib3/react';

function App() {
  const { wallet, drops, error } = useSdk();
  const [myDrops, setMyDrops] = useState([]);
  
  // Connect wallet when button is clicked
  const handleConnect = () => {
    wallet.connect();
  };
  
  // Fetch drops when wallet is connected
  useEffect(() => {
    const fetchDrops = async () => {
      if (wallet.recipientAddress) {
        const dropsData = await drops.all();
        if (dropsData) {
          setMyDrops(dropsData);
        }
      }
    };
    
    fetchDrops();
  }, [wallet.recipientAddress]);
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      {!wallet.recipientAddress ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {wallet.recipientAddress}</p>
          <h2>My Drops</h2>
          {myDrops.map(drop => (
            <div key={drop.id}>
              <h3>{drop.name}</h3>
              <p>{drop.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### useSdk Hook

The main export of this package is the `useSdk` hook, which provides access to wallet functionality and Inscrib3 operations.

```jsx
import useSdk from '@inscrib3/react';

const MyComponent = () => {
  const { wallet, drops, error } = useSdk();
  
  // Use the SDK functionality
};
```

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `error` | string \| null | Error message if an operation fails |
| `wallet` | object | Wallet connection and signing functions |
| `drops` | object | Operations for managing drops |

### Wallet Operations

The `wallet` object provides functions for connecting to a Bitcoin wallet and signing messages.

```jsx
const { wallet } = useSdk();

// Connect wallet
await wallet.connect();

// Access wallet addresses
const paymentAddress = wallet.paymentAddress;
const recipientAddress = wallet.recipientAddress;

// Sign a message
const signature = await wallet.signMessage(address, message);
```

#### Wallet Properties and Methods

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `paymentAddress` | string | User's payment address |
| `paymentPublicKey` | string | User's payment public key |
| `recipientAddress` | string | User's ordinals recipient address |
| `recipientPublicKey` | string | User's ordinals recipient public key |
| `connect()` | function | Connects to the wallet and requests necessary permissions |
| `signMessage(address, message)` | function | Signs a message with the specified address |

### Drops Management

The `drops` object provides simplified methods for managing Ordinals drops, abstracting away the authentication details.

```jsx
const { drops } = useSdk();

// Create a new drop
const newDrop = await drops.create(
  "My Drop",
  "DROP",
  "Description of my drop",
  fileList,  // FileList object containing the icon
  "10000"    // price in sats
);

// Get all drops
const allDrops = await drops.all();

// Get a specific drop
const drop = await drops.read("drop-id");

// Remove a drop
await drops.remove("drop-id");

// Mint from a drop
const mintResult = await drops.mint("drop-id");
```

#### Drops Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `create(name, symbol, description, fileList, price)` | (string, string, string, FileList, string) | Creates a new drop |
| `all()` | () | Gets all drops for the connected user |
| `read(id)` | (string) | Gets details of a specific drop |
| `remove(id)` | (string) | Removes a drop |
| `mint(id)` | (string) | Mints from a drop (handles signing and broadcasting) |

### Uploads Management

The `drops.uploads` object provides methods for managing files in a drop.

```jsx
const { drops } = useSdk();

// Get all uploads for a drop
const uploads = await drops.uploads.all("drop-id");

// Update uploads for a drop
const updateResult = await drops.uploads.update("drop-id", fileList);

// Remove uploads from a drop
const removeResult = await drops.uploads.remove("drop-id", ["file1.png", "file2.png"]);
```

#### Uploads Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `all(id)` | (string) | Gets all uploads for a drop |
| `update(id, fileList)` | (string, FileList) | Adds new files to a drop |
| `remove(id, files)` | (string, string[]) | Removes files from a drop |

## Error Handling

The `useSdk` hook provides an `error` state that will be set when operations fail. You should display this to the user when it's not null.

```jsx
const { error } = useSdk();

if (error) {
  return <div className="error">{error}</div>;
}
```

All methods automatically handle errors and update the error state, so you don't need to wrap them in try-catch blocks.

## Wallet Connection Flow

The React SDK handles the complete wallet connection flow:

1. When `wallet.connect()` is called, it requests connection to the wallet
2. It requests both Payment and Ordinals addresses
3. It automatically requests a signature for authentication
4. It stores offline the addresses, message, and signature for use in API calls

This means you don't need to handle the authentication flow manually - just call `wallet.connect()` and the hook will take care of the rest.

## Complete Example: Creating and Minting a Drop

```jsx
import React, { useState } from 'react';
import useSdk from '@inscrib3/react';

const CreateDropPage = () => {
  const { wallet, drops, error } = useSdk();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState(null);
  const [createdDrop, setCreatedDrop] = useState(null);
  const [mintResult, setMintResult] = useState(null);

  const handleConnect = async () => {
    await wallet.connect();
  };

  const handleCreateDrop = async (e) => {
    e.preventDefault();
    const drop = await drops.create(name, symbol, description, files, price);
    if (drop) {
      setCreatedDrop(drop);
      // Upload additional files
      if (files && files.length > 1) {
        await drops.uploads.update(drop.id, files);
      }
    }
  };

  const handleMint = async () => {
    const result = await drops.mint(createdDrop.id);
    if (result) {
      setMintResult(result);
    }
  };

  if (!wallet.paymentAddress) {
    return (
      <div>
        <h1>Please connect your wallet</h1>
        <button onClick={handleConnect}>Connect Wallet</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      <h1>Create New Ordinals Drop</h1>
      
      {!createdDrop ? (
        <form onSubmit={handleCreateDrop}>
          <div>
            <label>Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label>Symbol:</label>
            <input 
              type="text" 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label>Description:</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label>Price (sats):</label>
            <input 
              type="text" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label>Files:</label>
            <input 
              type="file" 
              onChange={(e) => setFiles(e.target.files)} 
              multiple 
              required 
            />
          </div>
          
          <button type="submit">Create Drop</button>
        </form>
      ) : (
        <div>
          <h2>Drop Created Successfully!</h2>
          <p>Drop ID: {createdDrop.id}</p>
          
          {!mintResult ? (
            <button onClick={handleMint}>Mint from Drop</button>
          ) : (
            <div>
              <h3>Mint Successful!</h3>
              <p>Transaction ID: {mintResult.txid}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## Implementation Details

### Automatic PSBT Signing

The React SDK automatically handles the PSBT signing process when minting from a drop:

1. It calls the SDK's `mint` method to get the PSBTs
2. It uses `sats-connect` to request signatures for both PSBTs
3. It automatically broadcasts the signed PSBTs

This means you don't need to handle the signing process manually - just call `drops.mint(id)` and the hook will take care of the rest.

### Network Configuration

The SDK is configured to use the Bitcoin Signet network by default. This is suitable for testing and development.

## TypeScript Support

The library is written in TypeScript and includes full type definitions. You'll get autocomplete and type checking out of the box when using TypeScript.

## License

MIT
