// ============================================================
// CHAOS OFFICE — Chat System
// ============================================================

import { AgentType, ChatMessage } from './types.js';
import { IDLE_CHATS } from './constants.js';
import { Agent } from './agent.js';

let _chatIdCounter = 0;

export class ChatSystem {
  messages: ChatMessage[];
  private idleTimer: number;
  private readonly idleInterval: number;
  private readonly maxMessages: number;

  constructor() {
    this.messages = [];
    this.idleTimer = 3; // first idle message after 3s
    this.idleInterval = 4; // seconds between idle messages
    this.maxMessages = 60;
  }

  addMessage(agentName: string, agentType: AgentType | 'SYSTEM', text: string): void {
    const msg: ChatMessage = {
      id: _chatIdCounter++,
      agentName,
      agentType,
      text,
      timestamp: Date.now(),
    };
    this.messages.unshift(msg);
    if (this.messages.length > this.maxMessages) {
      this.messages.length = this.maxMessages;
    }
  }

  addSystemMessage(text: string): void {
    this.addMessage('SYSTEM', 'SYSTEM', text);
  }

  updateIdle(dt: number, agents: Agent[]): void {
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      this.idleTimer = this.idleInterval + Math.random() * 3;
      this.spawnIdleMessage(agents);
    }
  }

  private spawnIdleMessage(agents: Agent[]): void {
    const active = agents.filter(a => a.state !== 'ESCAPED' as never);
    if (active.length === 0) return;
    const agent = active[Math.floor(Math.random() * active.length)];
    const lines = IDLE_CHATS[agent.type] ?? ['...'];
    const text = lines[Math.floor(Math.random() * lines.length)];
    this.addMessage(agent.name, agent.type, text);
  }

  // Event-triggered messages
  onPizza(droppedBy?: string): void {
    this.addSystemMessage(`🍕 PIZZA ALERT! ${droppedBy ? droppedBy + ' left' : 'There\'s'} pizza in the office!`);
    this.addMessage('Everyone', 'SYSTEM' as AgentType, 'PIZZA!!!');
  }

  onFireAlarm(): void {
    this.addSystemMessage('🔥 FIRE ALARM - EVACUATE IMMEDIATELY!');
  }

  onCatAppear(): void {
    this.addSystemMessage('🐱 An office cat has appeared!');
    // Find an intern and make them react
    this.addMessage('Intern', AgentType.INTERN, 'OMG A CAT 🐱');
  }

  onMeeting(): void {
    this.addSystemMessage('📊 Meeting room placed! Manager activates herding protocol.');
    this.addMessage('Manager', AgentType.MANAGER, 'Everyone! Conference room, NOW!');
  }

  onMeetingEnd(): void {
    this.addSystemMessage('📊 Meeting ended. That could have been an email.');
    this.addMessage('Everyone', 'SYSTEM' as AgentType, '...*slowly returns to desks*');
  }

  onFridayMode(enabled: boolean): void {
    if (enabled) {
      this.addSystemMessage('🎉 FRIDAY AFTERNOON MODE ACTIVATED');
      this.addMessage('Dave', AgentType.WANDERER, 'Is it 5 o\'clock yet?');
    } else {
      this.addSystemMessage('📅 Back to work mode. Monday vibes.');
    }
  }

  onDeskBroken(agentName: string): void {
    this.addMessage(agentName, AgentType.CHAOS_AGENT, 'Oops... 💥');
    this.addSystemMessage(`💥 A desk has been destroyed!`);
  }

  onGossipHuddle(agentName: string): void {
    const gossipLines = [
      'Did you hear about the new policy?',
      'Between you and me...',
      'So apparently, management said...',
      'Don\'t tell anyone but...',
      'I heard we\'re getting restructured!',
    ];
    const text = gossipLines[Math.floor(Math.random() * gossipLines.length)];
    this.addMessage(agentName, AgentType.GOSSIP, text);
  }

  onManagerDisperse(agentName: string): void {
    const lines = [
      'Back to work, everyone!',
      'This isn\'t a social club!',
      'Break it up, break it up.',
      'We need to synergize separately.',
    ];
    this.addMessage(agentName, AgentType.MANAGER, lines[Math.floor(Math.random() * lines.length)]);
  }

  onCoffeeReached(agentName: string): void {
    const lines = [
      '*sips coffee* Ahh, needed that.',
      'Finally! Coffee.',
      'This is my fifth cup today.',
      'Black coffee, no sugar, no happiness.',
    ];
    this.addMessage(agentName, AgentType.WANDERER, lines[Math.floor(Math.random() * lines.length)]);
  }

  onInternFollows(agentName: string, targetName: string): void {
    this.addMessage(agentName, AgentType.INTERN, `*follows ${targetName} nervously*`);
  }

  // New disturbances
  onCoffeeSpill(agentName: string): void {
    this.addMessage(agentName, AgentType.CHAOS_AGENT, 'I may have broken the coffee machine... ☕');
    this.addSystemMessage('☕ Coffee machine is OUT OF ORDER!');
  }

  onCoffeeMachineFixed(): void {
    this.addSystemMessage('☕ Coffee machine is back online!');
    this.addMessage('Wanderer', AgentType.WANDERER, 'FINALLY. I\'ve been suffering.');
  }

  onMondayMode(enabled: boolean): void {
    if (enabled) {
      this.addSystemMessage('💀 MONDAY MODE ACTIVATED. Everything is grey.');
      this.addMessage('Everyone', 'SYSTEM' as AgentType, '*collective groan*');
      this.addMessage('Stanley', AgentType.GRINDER, 'I hate Mondays.');
    } else {
      this.addSystemMessage('☀️ Monday Mode deactivated. Energy slowly returning...');
    }
  }

  onReplyAll(agentName: string): void {
    this.addMessage(agentName, AgentType.CHAOS_AGENT, 'Sent. Wait—REPLY ALL?! No no no no no—');
    this.addSystemMessage('📧 REPLY-ALL EMAIL sent to entire company!');
    this.addMessage('Karen', AgentType.GOSSIP, 'Who sent this?! PLEASE STOP REPLYING ALL!');
    this.addMessage('Michael', AgentType.MANAGER, 'THIS EMAIL DOES NOT CONCERN ME. *replies all*');
  }

  onPowerNap(agentName: string): void {
    this.addMessage(agentName, AgentType.GRINDER, '*falls asleep at desk* zzzZZZ...');
    this.addSystemMessage(`💤 ${agentName} is power napping. Shhh.`);
  }

  onLoudMusic(agentName: string): void {
    this.addMessage(agentName, AgentType.CHAOS_AGENT, '*plays EXTREMELY loud music* 🎵🔊');
    this.addSystemMessage('🎵 Loud music detected! Nearby agents fleeing.');
    this.addMessage('Dwight', AgentType.GRINDER, 'TURN THAT OFF! I AM TRYING TO WORK!');
  }

  onLoudMusicEnd(): void {
    this.addSystemMessage('🎵 Music stopped. Productivity slowly returns.');
  }

  onNewHire(agentName: string): void {
    this.addSystemMessage(`📦 New hire ${agentName} has joined the office!`);
    this.addMessage(agentName, AgentType.INTERN, 'Hi everyone! Excited to be here!');
    this.addMessage('Creed', AgentType.OBSERVER, '...I\'ve never seen that person before in my life.');
  }

  onPingPong(): void {
    this.addSystemMessage('🏓 Ping Pong table is open! Break room activated.');
    this.addMessage('Andy', AgentType.WANDERER, 'PING PONG TOURNAMENT! Who\'s in?!');
    this.addMessage('Dwight', AgentType.GRINDER, 'Table tennis is for the weak. I remain at my desk.');
  }

  onPingPongEnd(): void {
    this.addSystemMessage('🏓 Break time over. Back to work.');
  }

  on1701(): void {
    this.addSystemMessage('⏰ 17:01 on a Friday — freedom imminent!');
    this.addMessage('Everyone', 'SYSTEM' as AgentType, '🎉🎉🎉 FRIDAY!!! 🎉🎉🎉');
  }

  onObserverUnlocked(): void {
    this.addSystemMessage('👁 The Observer has been watching all along...');
    this.addMessage('Observer', AgentType.OBSERVER, '...');
  }
}
