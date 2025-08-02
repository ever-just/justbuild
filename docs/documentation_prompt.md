# Comprehensive EverJust Project Documentation Prompt

Generate an extensive markdown documentation file that thoroughly documents the EverJust.dev platform. This should be a professional, detailed technical documentation that covers every aspect of the project. Use the following structure and ensure comprehensive coverage of each section:

## Documentation Structure Required:

### 1. PROJECT OVERVIEW & VISION
- **Project Name**: EverJust - AI-Powered Code Generation Platform
- **Project Mission**: Building EverJust.dev, a next-generation AI-powered development platform using Anthropic's Claude Code SDK
- **Core Value Proposition**: Democratizing code generation through AI-powered development tools
- **Target Audience**: Developers, designers, and non-technical users seeking rapid prototyping

### 2. ARCHITECTURE & SYSTEM DESIGN

#### 2.1 High-Level Architecture
- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Backend**: Next.js API routes with Server-Sent Events (SSE) streaming
- **AI Integration**: Anthropic Claude Code SDK (@anthropic-ai/claude-code v1.0.39)
- **Sandbox Environment**: Daytona SDK (@daytonaio/sdk v0.21.5) for isolated code execution
- **Styling**: Tailwind CSS 3.4.1 with custom design system
- **Development Tools**: TypeScript 5, Playwright testing, PostCSS, Autoprefixer

#### 2.2 System Components
- **Core Generation Engine**: Dual-mode generation system (Regular vs Daytona)
- **Intelligent Routing**: Automatic prompt analysis for generation method selection
- **Real-time Communication**: SSE streaming for live progress updates
- **Sandbox Management**: Automated Daytona workspace creation and cleanup
- **Preview System**: Live development server hosting in cloud sandboxes

#### 2.3 Data Flow & Communication
- **Client-to-Server**: HTTP POST requests with JSON payloads
- **Server-to-AI**: Claude Code SDK integration with tool permissions
- **Real-time Updates**: Server-Sent Events (SSE) streaming architecture
- **Sandbox Communication**: Daytona API integration for remote execution
- **Error Handling**: Comprehensive error categorization and user feedback

### 3. TECHNICAL IMPLEMENTATION DEEP DIVE

#### 3.1 Frontend Architecture (`platform/`)
- **App Router Structure**: Next.js 14 app directory pattern
- **Key Pages**: 
  - `/` - Landing page with prompt input
  - `/generate` - Real-time generation interface  
  - `/hello-world` - Demo page
  - `/connect4` - Game demonstration
- **Components**:
  - `MessageDisplay.tsx` - Real-time message rendering
  - `Navbar.tsx` - Navigation and branding
- **Styling**: Custom Tailwind configuration with EverJust branding

#### 3.2 Backend API Architecture
- **Generation Endpoints**:
  - `/api/generate` - Regular Claude Code generation
  - `/api/generate-daytona` - Sandbox-based generation
- **Features**:
  - CORS handling for cross-origin requests
  - Streaming responses with heartbeat keepalive
  - Comprehensive error handling and categorization
  - Process spawning for Daytona script execution

#### 3.3 AI Integration Layer
- **Claude Code SDK Integration**:
  - Query function with prompt processing
  - Tool permissions: Read, Write, Edit, MultiEdit, Bash, LS, Glob, Grep, WebSearch, WebFetch
  - Configurable maxTurns (10-20 turns depending on complexity)
  - Abort controller for graceful cancellation
- **Message Types**: claude_message, tool_use, tool_result, progress, error, complete

#### 3.4 Sandbox Environment (Daytona Integration)
- **Workspace Management**: Automated creation with Node.js 20 environment
- **Auto-cleanup**: 30-minute inactivity timeout with storage optimization
- **Development Server**: Automatic Next.js dev server startup on port 3000
- **Preview URLs**: Public HTTPS endpoints for live application access
- **Resource Management**: Comprehensive cleanup to avoid 30GB storage limits

### 4. DEVELOPMENT PHASES & COMMIT HISTORY ANALYSIS

#### Phase 1: Foundation (Initial Commits)
- Basic Next.js setup with Claude Code SDK integration
- Simple prompt-to-code generation functionality
- TypeScript configuration and build setup

#### Phase 2: Advanced Features (Commits: f0df21e - 8754e81)
- Implementation of streaming APIs
- TypeScript compilation fixes
- Error handling improvements

#### Phase 3: Network & Stability (Commits: 86f5ef6 - ac6267f)  
- SSE streaming network error fixes
- Connection stability improvements
- Heartbeat implementation for long-running processes

#### Phase 4: Daytona Integration (Commits: d51408b - 2ff59e2)
- Sandbox environment implementation
- Network timeout handling
- Comprehensive error categorization

#### Phase 5: Optimization & UX (Commits: 9f9f3d1 - aa55500)
- Storage limit management and cleanup systems
- Complete EverJust platform branding implementation
- Enhanced error messaging and user feedback

#### Phase 6: Intelligence & Polish (Commits: 7b6280e - a0fead7)
- Intelligent generation method auto-selection
- Enhanced error handling and timeout management
- UI/UX improvements and branding updates
- Logo integration and visual polish

### 5. INTELLIGENT GENERATION SYSTEM

#### 5.1 Dual-Mode Architecture
- **Regular Generation**: Direct Claude Code execution in current environment
- **Daytona Generation**: Isolated sandbox environment with full Node.js setup
- **Auto-Selection Logic**: Prompt analysis for complexity assessment

#### 5.2 Prompt Analysis Algorithm
- **Complex Indicators**: npm, database keywords, full-stack terms, framework mentions
- **Simple Indicators**: static, landing page, HTML/CSS, portfolio terms
- **Scoring System**: Weighted keyword analysis with default to Daytona for safety

#### 5.3 Error Handling & Recovery
- **Timeout Management**: Progressive timeout increases with retry logic
- **Error Categorization**: Network, authentication, quota, generation, and timeout errors
- **User Feedback**: Real-time error messages with actionable suggestions
- **Graceful Degradation**: Fallback options when preferred method fails

### 6. PACKAGE DEPENDENCIES & TECH STACK

#### 6.1 Core Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/claude-code": "^1.0.39",
    "@daytonaio/sdk": "^0.21.5",
    "dotenv": "^17.0.1",
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18"
  }
}
```

#### 6.2 Development Dependencies
```json
{
  "devDependencies": {
    "@playwright/test": "^1.54.1",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

#### 6.3 Runtime Dependencies (Root)
- @anthropic-ai/claude-code: Core AI integration
- @types/node: TypeScript Node.js definitions
- tsx: TypeScript execution for scripts
- typescript: TypeScript compiler

### 7. DEPLOYMENT & ENVIRONMENT CONFIGURATION

#### 7.1 Environment Variables
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key    # Claude API access
DAYTONA_API_KEY=your_daytona_api_key        # Sandbox environment access
```

#### 7.2 Development Setup
```bash
cd platform
npm install
npm run dev  # Launches on http://localhost:3001
```

#### 7.3 Production Considerations
- Environment variable security
- API key rotation policies
- Daytona quota management
- Cleanup automation for storage optimization

### 8. FEATURE SPECIFICATIONS

#### 8.1 Generation Capabilities
- **Full-Stack Applications**: Complete Next.js applications with TypeScript
- **Frontend Components**: React components with Tailwind styling
- **Backend APIs**: Express.js, FastAPI, and other server implementations
- **Database Integration**: MongoDB, PostgreSQL, MySQL support
- **Authentication Systems**: User management and auth flows
- **Real-time Features**: WebSocket and real-time communication

#### 8.2 User Experience Features
- **Real-time Progress**: Live generation updates with SSE streaming
- **Error Recovery**: Intelligent error handling with retry mechanisms
- **Preview System**: Instant live previews of generated applications
- **Sandbox Management**: Automatic cleanup and resource optimization
- **Intelligent Routing**: Automatic selection of optimal generation method

### 9. SCRIPTS & AUTOMATION

#### 9.1 Core Scripts
- `generate-in-daytona.ts`: Primary Daytona generation orchestrator
- `test-preview-url.ts`: Preview URL validation and testing
- `get-preview-url.ts`: Retrieve preview URLs for existing sandboxes
- `remove-sandbox.ts`: Cleanup and sandbox deletion
- `start-dev-server.ts`: Development server management
- `cleanup-sandboxes.ts`: Bulk cleanup operations

#### 9.2 Automation Features
- **Auto-cleanup**: 30-minute inactivity timeout
- **Retry Logic**: Progressive timeout increases with multiple retry attempts
- **Health Monitoring**: Server startup verification and health checks
- **Resource Management**: Storage optimization to prevent quota exhaustion

### 10. SECURITY & BEST PRACTICES

#### 10.1 API Security
- Environment variable isolation
- CORS configuration for cross-origin requests
- API key validation and error handling
- Secure token transmission

#### 10.2 Sandbox Security
- Isolated execution environments
- Automatic cleanup and termination
- Resource quotas and limitations
- Network isolation and controlled access

### 11. PERFORMANCE OPTIMIZATION

#### 11.1 Streaming Architecture
- Server-Sent Events for real-time updates
- Heartbeat mechanisms to prevent proxy timeouts
- Efficient message parsing and routing
- Memory management for long-running processes

#### 11.2 Resource Management
- Intelligent timeout handling
- Progressive retry mechanisms
- Storage optimization with automated cleanup
- Connection pooling and reuse

### 12. TESTING & QUALITY ASSURANCE

#### 12.1 Testing Infrastructure
- Playwright end-to-end testing setup
- TypeScript type checking
- ESLint configuration for code quality
- Automated testing scripts

#### 12.2 Quality Metrics
- Generation success rates
- Error categorization and tracking
- Performance monitoring
- User experience analytics

### 13. FUTURE ROADMAP & EXTENSIBILITY

#### 13.1 Planned Enhancements
- Enhanced prompt analysis and categorization
- Additional AI model integrations
- Advanced debugging and logging
- Performance optimization and caching

#### 13.2 Extensibility Points
- Plugin architecture for additional tools
- Custom generation templates
- Advanced error recovery mechanisms
- Integration with additional cloud providers

### 14. TROUBLESHOOTING & COMMON ISSUES

#### 14.1 Common Error Categories
- **Timeout Errors**: Generation complexity exceeding time limits
- **Network Errors**: API connectivity and service availability
- **Authentication Errors**: Invalid or expired API keys
- **Quota Errors**: Usage limits and resource constraints
- **Generation Errors**: Claude Code processing failures

#### 14.2 Resolution Strategies
- Progressive timeout increases
- Automatic retry mechanisms
- Graceful degradation options
- User-friendly error messaging with actionable guidance

### 15. CONTRIBUTION GUIDELINES & DEVELOPMENT

#### 15.1 Code Standards
- TypeScript strict mode enforcement
- ESLint and Prettier configuration
- Component-based architecture
- Comprehensive error handling

#### 15.2 Development Workflow
- Feature branch development
- Comprehensive testing requirements
- Documentation updates
- Performance impact assessment

This documentation should be comprehensive, technically accurate, and serve as both a reference guide and technical specification for the EverJust project. Include code examples, configuration snippets, and architectural diagrams where appropriate to illustrate complex concepts. 