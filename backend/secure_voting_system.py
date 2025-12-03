#!/usr/bin/env python3
"""
Secure Voting System Implementation
===================================

A self-contained, secure, and auditable voting system demonstration.

Key Features:
- **Blockchain Ledger**: Votes are stored in a tamper-evident linked list (blockchain).
- **Cryptographic Integrity**: Each block is hashed (SHA-256) including the previous block's hash.
- **Voter Anonymity & Authentication**: Uses secret tokens for voting; identities are not directly linked to votes in the public ledger.
- **Double-Voting Prevention**: Tracks voter status to ensure one person, one vote.
- **Election Lifecycle**: Supports distinct phases (Setup, Open, Closed).

Usage:
    Run this script directly to see a full demonstration:
    $ python3 secure_voting_system.py
"""

import hashlib
import secrets
import time
import json
import sys
from typing import List, Dict, Optional
from enum import Enum
from dataclasses import dataclass, field, asdict

# Try to import Pydantic for robust validation, fall back to dataclasses if missing
try:
    from pydantic import BaseModel, Field, ValidationError
    USE_PYDANTIC = True
except ImportError:
    USE_PYDANTIC = False
    # Simple shim if pydantic is missing (though widely used)
    def Field(default=None, **kwargs): return field(default=default, metadata=kwargs)

# --- Configuration ---

DIFFICULTY = 1  # Mining difficulty for Proof of Work (increase for realism)
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"

# --- Enums & Constants ---

class ElectionState(str, Enum):
    SETUP = "SETUP"
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class VoterStatus(str, Enum):
    REGISTERED = "REGISTERED"
    VOTED = "VOTED"

# --- Data Models ---

if USE_PYDANTIC:
    class Vote(BaseModel):
        """Represents a single cast vote."""
        voter_hash: str = Field(..., description="Hashed ID of the voter to preserve anonymity")
        candidate: str = Field(..., description="Name of the selected candidate")
        timestamp: float = Field(default_factory=time.time)

    class Block(BaseModel):
        """A block in the voting ledger."""
        index: int
        timestamp: float
        vote: Vote
        previous_hash: str
        nonce: int = 0
        hash: str = ""

        def compute_hash(self) -> str:
            """Calculates SHA-256 hash of the block content."""
            block_data = {
                "index": self.index,
                "timestamp": self.timestamp,
                "vote": self.vote.model_dump(),
                "previous_hash": self.previous_hash,
                "nonce": self.nonce
            }
            # Sort keys for consistent hashing
            block_string = json.dumps(block_data, sort_keys=True)
            return hashlib.sha256(block_string.encode()).hexdigest()

        def mine(self, difficulty: int):
            """Performs Proof-of-Work to validate the block."""
            target = "0" * difficulty
            while not self.hash.startswith(target):
                self.nonce += 1
                self.hash = self.compute_hash()
else:
    # Fallback classes if Pydantic is not available
    @dataclass
    class Vote:
        voter_hash: str
        candidate: str
        timestamp: float = field(default_factory=time.time)
        def model_dump(self): return asdict(self)

    @dataclass
    class Block:
        index: int
        timestamp: float
        vote: Vote
        previous_hash: str
        nonce: int = 0
        hash: str = ""

        def compute_hash(self) -> str:
            block_data = {
                "index": self.index,
                "timestamp": self.timestamp,
                "vote": self.vote.model_dump(),
                "previous_hash": self.previous_hash,
                "nonce": self.nonce
            }
            block_string = json.dumps(block_data, sort_keys=True)
            return hashlib.sha256(block_string.encode()).hexdigest()

        def mine(self, difficulty: int):
            target = "0" * difficulty
            while not self.hash.startswith(target):
                self.nonce += 1
                self.hash = self.compute_hash()

@dataclass
class Voter:
    """Internal voter record."""
    public_id: str
    token_hash: str
    status: VoterStatus = VoterStatus.REGISTERED

# --- Core System ---

class SecureVotingSystem:
    def __init__(self):
        self.chain: List[Block] = []
        self.voters: Dict[str, Voter] = {}
        self.token_map: Dict[str, str] = {}      # token_hash -> public_id (Simulates Auth DB)
        self.candidates: List[str] = []
        self.state: ElectionState = ElectionState.SETUP
        
        self._create_genesis_block()

    def _create_genesis_block(self):
        """Initializes the chain with a genesis block."""
        genesis_vote = Vote(voter_hash="SYSTEM", candidate="GENESIS")
        genesis_block = Block(
            index=0,
            timestamp=time.time(),
            vote=genesis_vote,
            previous_hash="0" * 64
        )
        genesis_block.mine(DIFFICULTY)
        self.chain.append(genesis_block)

    # --- Admin Functions ---

    def open_election(self):
        self.state = ElectionState.OPEN
        print(f"📢 Election is now {self.state.value}!")

    def close_election(self):
        self.state = ElectionState.CLOSED
        print(f"🔒 Election is now {self.state.value}!")

    def register_candidate(self, name: str):
        if self.state != ElectionState.SETUP:
            print(f"⚠️  Cannot register candidate '{name}': Election is not in SETUP phase.")
            return
        if name in self.candidates:
            print(f"⚠️  Candidate '{name}' already registered.")
            return
        self.candidates.append(name)
        print(f"✅ Candidate registered: {name}")

    def register_voter(self) -> str:
        """
        Registers a voter and returns a secret token.
        The token is the ONLY way to cast a vote.
        """
        if self.state == ElectionState.CLOSED:
            raise RuntimeError("Election is closed.")

        # 1. Generate secure credentials
        raw_token = secrets.token_hex(16)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # 2. Generate a pseudonym public ID (untraceable to real identity in a real system)
        public_id = hashlib.sha256(token_hash.encode()).hexdigest()[:12]

        # 3. Store internal record
        voter = Voter(public_id=public_id, token_hash=token_hash)
        self.voters[public_id] = voter
        self.token_map[token_hash] = public_id
        
        return raw_token

    # --- User Functions ---

    def cast_vote(self, token: str, candidate: str) -> bool:
        if self.state != ElectionState.OPEN:
            print("❌ Vote Rejected: Election is not OPEN.")
            return False

        # 1. Authenticate
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        public_id = self.token_map.get(token_hash)
        
        if not public_id:
            print("❌ Vote Rejected: Invalid Token.")
            return False

        voter = self.voters[public_id]

        # 2. Authorization
        if voter.status == VoterStatus.VOTED:
            print(f"❌ Vote Rejected: Voter ({public_id}) has already voted.")
            return False

        if candidate not in self.candidates:
            print(f"❌ Vote Rejected: '{candidate}' is not a valid candidate.")
            return False

        # 3. Process Vote
        # Create the vote object
        vote = Vote(voter_hash=public_id, candidate=candidate)
        
        # Create and mine the block
        last_block = self.chain[-1]
        new_block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            vote=vote,
            previous_hash=last_block.hash
        )
        new_block.mine(DIFFICULTY)
        
        # 4. Commit
        self.chain.append(new_block)
        voter.status = VoterStatus.VOTED
        
        print(f"🗳️  Vote Accepted: {candidate} (Block #{new_block.index} - {new_block.hash[:8]}...)")
        return True

    # --- Audit & Results ---

    def verify_chain(self) -> bool:
        """Validates the integrity of the entire blockchain."""
        print("\n🔍 Running Integrity Audit...")
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            prev = self.chain[i-1]

            # 1. Check Link
            if current.previous_hash != prev.hash:
                print(f"🚨 TAMPERING DETECTED: Block #{i} does not link to Block #{i-1}!")
                return False
            
            # 2. Check Content (Re-hash)
            if current.hash != current.compute_hash():
                print(f"🚨 TAMPERING DETECTED: Block #{i} content has been modified!")
                return False
        
        print("✅ System Integrity Verified: All blocks are valid.")
        return True

    def get_results(self) -> Dict[str, int]:
        tally = {c: 0 for c in self.candidates}
        for block in self.chain[1:]: # Skip Genesis
            c = block.vote.candidate
            if c in tally:
                tally[c] += 1
        return tally

# --- Demonstration ---

def format_header(title):
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{ '='*50}")

def run_demo():
    format_header("SECURE VOTING SYSTEM V2.0")
    
    svs = SecureVotingSystem()

    # 1. Setup
    print("\n[Phase 1: Configuration]")
    svs.register_candidate("Alice (The Architect)")
    svs.register_candidate("Bob (The Builder)")
    svs.register_candidate("Charlie (The Wildcard)")
    
    svs.open_election()

    # 2. Registration
    print("\n[Phase 2: Voter Registration]")
    tokens = []
    for i in range(3):
        t = svs.register_voter()
        print(f"  -> Voter {i+1} registered. Secret Token: {t[:8]}... (secure)")
        tokens.append(t)

    # 3. Voting
    print("\n[Phase 3: Voting]")
    
    # Normal Votes
    svs.cast_vote(tokens[0], "Alice (The Architect)")
    svs.cast_vote(tokens[1], "Bob (The Builder)")
    
    # Error Cases
    print("  >> Attempting double vote...")
    svs.cast_vote(tokens[0], "Charlie (The Wildcard)")
    
    print("  >> Attempting invalid token...")
    svs.cast_vote("invalid_token_string", "Alice (The Architect)")

    # Valid Vote
    svs.cast_vote(tokens[2], "Alice (The Architect)")

    # 4. Closing
    print("\n[Phase 4: Finalization]")
    svs.close_election()
    
    # 5. Audit
    svs.verify_chain()

    # 6. Results
    print("\n[Phase 5: Election Results]")
    results = svs.get_results()
    total = sum(results.values())
    
    print(f"Total Votes Cast: {total}\n")
    for cand, count in results.items():
        percent = (count / total * 100) if total > 0 else 0
        bar = "█" * int(percent / 5)
        print(f"{cand:<25} | {count:>2} | {bar:<20} ({percent:.1f}%)")

    # 7. Tamper Test
    print("\n[Phase 6: Security Simulation]")
    print(">> Simulating a database hack (modifying Block #1)...")
    if len(svs.chain) > 1:
        target = svs.chain[1]
        target.vote.candidate = "Charlie (The Wildcard)"
        # Note: We changed data but didn't re-mine or update hash
        
        is_secure = svs.verify_chain()
        if not is_secure:
            print(">> System successfully detected the unauthorized change.")

if __name__ == "__main__":
    run_demo()