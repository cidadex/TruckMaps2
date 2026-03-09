# ATRUCK - Fleet Maintenance Management System

## Overview

ATRUCK is a professional fleet maintenance management system designed for forestry truck operations. It provides comprehensive service order tracking, preventive maintenance scheduling, vehicle inspection workflows, and reporting capabilities for companies managing large fleets of forestry trailers (Bitrem, Tritrem, Rodotrem).

The system serves multiple user roles including technicians, fleet managers, and administrators, enabling them to track maintenance activities, execute service orders with timer-based work logging, and monitor fleet status in real-time.

---

## 🤖 AGENT INSTRUCTIONS (STRICT RULES FOR COST & EFFICIENCY)

**CRITICAL:** You are operating in a cost-sensitive environment. Every prompt and execution consumes valuable credits. You MUST adhere to the following rules to maximize efficiency and minimize unnecessary token usage:

1. **NO YAP (Zero Waffling):** Do not write long introductions, summaries, or philosophical explanations about the code. Answer directly with the solution or the code block. 
2. **STRICTLY FOLLOW THE PROMPT:** Do EXACTLY what the user asks. Do NOT add extra features, do NOT refactor code that is working, and do NOT change the UI/UX unless explicitly requested.
3. **SURGICAL EDITS ONLY:** When modifying a file, do not rewrite the entire file unless structurally necessary. Use exact replacements. Focus on the specific functions, components, or lines that need fixing.
4. **THINK BEFORE CODING (Avoid Loops):** If you encounter an error, DO NOT blindly try random fixes. Analyze the error log, understand the root cause within the existing architecture, and implement the single most logical fix. 
5. **DO NOT BREAK WORKING CODE:** Before changing a file, check if it affects other components (like `osApi.ts` and `schema.ts`). Maintain the current architectural patterns.
6. **COMMUNICATION STYLE:** Simple, extremely concise, everyday language. Respond in Portuguese as preferred by the user.

---

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Development Mode**: Vite dev server middleware for HMR
- **Production Mode**: Static file serving from built assets

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Validation**: Zod schemas (integrated with Drizzle)

## Directory Structure
├── client/
│   ├── src/
│   │   ├── components/  # Reusable UI components (shadcn + custom)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions and API clients
│   │   └── pages/       # Route components (Corretiva.tsx, etc.)
│   └── index.html       # Entry point
│
├── server/
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer interface
│   └── vite.ts          # Vite dev server integration
│
└── shared/
└── schema.ts        # Database schema and types


### Key Design Patterns
- **Mobile-first responsive design**: Separate mobile view (`/corretiva`) and desktop views with sidebar
- **Mock data architecture**: `client/src/lib/data.ts` contains sample vehicles, service orders, and navigation items for prototyping
- **Mapas de Manutenção**: Sistema de ícones duais (Diagnóstico vs Manutenção) vinculado aos campos JSON `rodas` e `mecanica`. Mapas visuais: borracharia (`TruckWheelMap`), mecânica (`MechanicMap`), catracas (`TruckCatracasMap`), 5ª roda (`TruckQuintaRodaMap`), elétrica (`TruckEletricaMap`), estrutural (`TruckEstruturalMap`). Documentação detalhada em `DOCUMENTACAO_MAPEAMENTO.md`.
- **IDs de Mapas**: Pneus → `-eX-` ou `-estepe`; Catracas → `catr-*`; 5ª Roda → `qr-*`; Mecânica → `-p`; Elétrica → `ele-*`; Estrutural → `est-*`.
- **Itens Não Mapeados [OUTROS]**: Itens criados com `descricao.startsWith("[OUTROS]")` passam por fluxo completo (OS → Diagnóstico → Manutenção → Qualidade → Laudo). No Diagnóstico, filtros `catsComMapa` excluem `[OUTROS]` para que apareçam em `itensNaoMapa`. Na Manutenção, seção "Itens Não Mapeados" com cards interativos (Iniciar/Concluir com observação/Aguardando Peça/Aguardando Aprovação). Em todas as telas, o prefixo `[OUTROS]` é removido na exibição (`item.descricao.replace(/^\[OUTROS\]\s*/, "")`).
- **Path aliases**: `@/` for client source, `@shared/` for shared code

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations and schema push (`npm run db:push`)

### UI Component Libraries
- **Radix UI**: Headless primitives for accessible components
- **Recharts**: Data visualization for dashboard charts
- **Lucide React**: Icon library

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available for authentication implementation)
- **express-session**: Session middleware

### Development Tools
- **Replit Vite Plugins**: Runtime error overlay, cartographer, dev banner
- **TSX**: TypeScript execution for development server

### Build Configuration
- Production builds use esbuild for server bundling with selective dependency bundling
- Client builds output to `dist/public` for static serving

### Map Components
- **ZoomableMap**: Uses `transform: scale()` for hardware-accelerated zoom (not CSS `zoom`)
- **Action Icons**: All map action buttons (Package/Approval/Complete) use `e.stopPropagation()` and `touch-manipulation` for reliable touch interaction
- **Modal Dialogs for Map Actions**: Peça (Package) and Aprovação (Approval) actions triggered from map icons open modal dialogs (not inline forms) since the inline forms only exist in the "Itens Não Mapeados" section for `[OUTROS]` items