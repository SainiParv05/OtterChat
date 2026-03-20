# How OtterChat Works (Tor P2P Architecture)

OtterChat has been redesigned as a **fully decentralized, ephemeral, P2P messenger running natively on the Tor network**. There is no central database that stores your messages. 

Here is the step-by-step breakdown of how data flows through the system.

---

### Step 1: Local Initialization
When you run `docker compose up -d`, you are spinning up your own isolated **P2P Node** (Backend) and **User Interface** (Frontend).
- Your frontend runs on port `3000` (what you see in the browser).
- Your backend runs on port `3001` (acting as the brain of your node).

When you sign in using a Username, the local backend generates a temporary cryptographic keypair for your session and assigns your Username as your **User ID**.

### Step 2: The Directory Server (The Phonebook)
Because there is no central server routing messages, peers need a way to find each other. This is where the **Directory Server** (running on port `4000`) comes in.
- You must have a Tor `.onion` address tied to your machine. 
- When you click **Publish Node Contact**, your frontend tells the Directory Server: *"Hey, user `Parv` can be reached at `py3id...onion`"*.
- The Directory Server stores **nothing but your Username, Public Key, and Onion Address**.

### Step 3: Searching & Connecting
When you want to chat with a friend:
1. You type their Username into the **Search Directory** box.
2. The Directory Server responds with your friend's `.onion` address.
3. You click **Connect**.
4. **The Magic Happens**: Your local backend takes your connection request and routes it through your system's Tor proxy (SOCKS5 at `localhost:9050`). The request travels across the Tor network completely anonymously and arrives directly at your friend's `.onion` address!

### Step 4: Accepting & Messaging
1. Your friend's local backend receives the incoming P2P request and alerts their frontend UI.
2. If they click **Accept**, their backend maps your `.onion` address to an active session.
3. Every message you type is **encrypted locally within your React frontend** using your friend's Public Key.
4. The encrypted text is sent to your local backend, routed over Tor via the SOCKS5 proxy, and delivered directly to your friend's backend.
5. Your friend's frontend decrypts the message and displays it.

### Step 5: The "Burn" Phase (Zero Persistence)
- **Nothing touches a database**. All active chats and messages are stored in RAM (React State and Node.js memory arrays).
- The moment you click **Burn Chat** or refresh the page, the variables vanish. Everything is irrecoverably deleted, ensuring a truly ephemeral and untraceable communication pipeline.
