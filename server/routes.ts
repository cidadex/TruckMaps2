import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertFuncionarioSchema, insertUserSchema, users as usersTable } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const sessionTokens = new Map<string, string>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);

  // === AUTH ENDPOINTS ===

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }
      const token = randomUUID();
      sessionTokens.set(token, user.id);
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ error: "Usuário já existe" });
      }
      const user = await storage.createUser(parsed.data);
      const token = randomUUID();
      sessionTokens.set(token, user.id);
      res.status(201).json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({ error: "Erro no registro" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      const token = authHeader.substring(7);
      const userId = sessionTokens.get(token);
      if (!userId) {
        return res.status(401).json({ error: "Token inválido" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      res.status(500).json({ error: "Erro ao verificar sessão" });
    }
  });

  app.get("/api/auth/check-users", async (_req, res) => {
    try {
      const allUsers = await db.select().from(usersTable).limit(1);
      res.json({ hasUsers: allUsers.length > 0 });
    } catch (error) {
      res.json({ hasUsers: false });
    }
  });

  // Health check route
  app.get("/health", (_req, res) => {
    res.status(200).send("OK");
  });

  app.get("/api/funcionarios", async (req, res) => {
    try {
      const funcionarios = await storage.getAllFuncionarios();
      res.json(funcionarios);
    } catch (error) {
      console.error("Erro ao buscar funcionários:", error);
      res.status(500).json({ error: "Erro ao buscar funcionários" });
    }
  });

  app.get("/api/funcionarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const funcionario = await storage.getFuncionarioById(id);
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
      res.json(funcionario);
    } catch (error) {
      console.error("Erro ao buscar funcionário:", error);
      res.status(500).json({ error: "Erro ao buscar funcionário" });
    }
  });

  app.post("/api/auth/pin", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || typeof pin !== "string") {
        return res.status(400).json({ error: "PIN inválido" });
      }
      const funcionario = await storage.getFuncionarioByPin(pin);
      if (!funcionario) {
        return res.status(401).json({ error: "PIN não encontrado" });
      }
      if (!funcionario.ativo) {
        return res.status(401).json({ error: "Funcionário inativo" });
      }
      res.json(funcionario);
    } catch (error) {
      console.error("Erro na autenticação:", error);
      res.status(500).json({ error: "Erro na autenticação" });
    }
  });

  app.post("/api/funcionarios", async (req, res) => {
    try {
      const parsed = insertFuncionarioSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      const existingByPin = await storage.getFuncionarioByPin(parsed.data.pin);
      if (existingByPin) {
        return res.status(400).json({ error: "PIN já está em uso" });
      }
      const funcionario = await storage.createFuncionario(parsed.data);
      res.status(201).json(funcionario);
    } catch (error) {
      console.error("Erro ao criar funcionário:", error);
      res.status(500).json({ error: "Erro ao criar funcionário" });
    }
  });

  const updateFuncionarioSchema = z.object({
    nome: z.string().min(1).optional(),
    pin: z.string().length(4).optional(),
    cargo: z.string().min(1).optional(),
    permNovaOs: z.boolean().optional(),
    permDiagnostico: z.boolean().optional(),
    permManutencao: z.boolean().optional(),
    permQualidade: z.boolean().optional(),
    permAguardandoPeca: z.boolean().optional(),
    permAguardandoAprovacao: z.boolean().optional(),
    permAcompanharOs: z.boolean().optional(),
    permLaudoTecnico: z.boolean().optional(),
    ativo: z.boolean().optional(),
  }).strict();

  app.patch("/api/funcionarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getFuncionarioById(id);
      if (!existing) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
      
      const { id: _, ...bodyWithoutId } = req.body;
      const parsed = updateFuncionarioSchema.safeParse(bodyWithoutId);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      if (parsed.data.pin && parsed.data.pin !== existing.pin) {
        const existingByPin = await storage.getFuncionarioByPin(parsed.data.pin);
        if (existingByPin) {
          return res.status(400).json({ error: "PIN já está em uso" });
        }
      }
      
      const funcionario = await storage.updateFuncionario(id, parsed.data);
      res.json(funcionario);
    } catch (error) {
      console.error("Erro ao atualizar funcionário:", error);
      res.status(500).json({ error: "Erro ao atualizar funcionário" });
    }
  });

  app.delete("/api/funcionarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFuncionario(id);
      if (!deleted) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      res.status(500).json({ error: "Erro ao excluir funcionário" });
    }
  });

  // === ORDENS DE SERVIÇO ===

  app.get("/api/os", async (req, res) => {
    try {
      const { status, empresa } = req.query;
      let osList;
      if (status && typeof status === "string") {
        osList = await storage.getOSByStatus(status);
      } else if (empresa && typeof empresa === "string") {
        osList = await storage.getOSByEmpresa(empresa);
      } else {
        osList = await storage.getAllOS();
      }
      const osWithItens = await Promise.all(
        osList.map(async (os) => ({
          ...os,
          itens: await storage.getOSItens(os.id),
        }))
      );
      res.json(osWithItens);
    } catch (error) {
      console.error("Erro ao buscar OS:", error);
      res.status(500).json({ error: "Erro ao buscar ordens de serviço" });
    }
  });

  app.get("/api/os/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const os = await storage.getOSById(id);
      if (!os) {
        return res.status(404).json({ error: "OS não encontrada" });
      }
      const itens = await storage.getOSItens(os.id);
      res.json({ ...os, itens });
    } catch (error) {
      console.error("Erro ao buscar OS:", error);
      res.status(500).json({ error: "Erro ao buscar ordem de serviço" });
    }
  });

  app.post("/api/os/motorista", async (req, res) => {
    try {
      const { placa } = req.body;
      if (!placa) {
        return res.status(400).json({ error: "Placa é obrigatória" });
      }
      const os = await storage.getOSByPlaca(placa);
      if (!os) {
        return res.status(404).json({ error: "Nenhuma OS encontrada para esta placa" });
      }
      const itens = await storage.getOSItens(os.id);
      res.json({ ...os, itens });
    } catch (error) {
      console.error("Erro ao buscar OS por placa:", error);
      res.status(500).json({ error: "Erro ao buscar OS" });
    }
  });

  const createOSSchema = z.object({
    placa: z.string().min(1),
    conjunto: z.string().min(1),
    empresa: z.string().min(1),
    transportadora: z.string().min(1),
    responsavel: z.string().min(1),
    codigoAcesso: z.string().min(1),
    itens: z.array(z.object({
      categoria: z.string().min(1),
      descricao: z.string().min(1),
    })),
    dataCriacao: z.string().optional(),
    tipoConjunto: z.string().optional(),
    placa2: z.string().optional(),
    placa3: z.string().optional(),
    rodas: z.string().optional(),
  });

  app.post("/api/os", async (req, res) => {
    try {
      const parsed = createOSSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      const numero = await storage.getNextOSNumero();
      const { itens, dataCriacao, tipoConjunto, placa2, placa3, rodas, ...osData } = parsed.data;
      
      const os = await storage.createOS({
        ...osData,
        numero,
        placa: osData.placa.toUpperCase(),
        status: "diagnostico",
        ...(dataCriacao && { dataCriacao: new Date(dataCriacao) }),
        ...(tipoConjunto && { tipoConjunto }),
        ...(placa2 && { placa2: placa2.toUpperCase() }),
        ...(placa3 && { placa3: placa3.toUpperCase() }),
        ...(rodas && { rodas }),
      });
      
      const createdItens = await storage.createOSItens(
        itens.map(item => ({ ...item, osId: os.id }))
      );
      
      res.status(201).json({ ...os, itens: createdItens });
    } catch (error) {
      console.error("Erro ao criar OS:", error);
      res.status(500).json({ error: "Erro ao criar ordem de serviço" });
    }
  });

  const updateOSSchema = z.object({
    status: z.string().optional(),
    responsavelDiagnosticoId: z.number().optional(),
    responsavelDiagnosticoNome: z.string().optional(),
    responsavelDiagnosticoIp: z.string().optional(),
    responsavelManutencaoId: z.number().optional(),
    responsavelManutencaoNome: z.string().optional(),
    responsavelManutencaoIp: z.string().optional(),
    responsavelQualidadeId: z.number().optional(),
    responsavelQualidadeNome: z.string().optional(),
    responsavelQualidadeIp: z.string().optional(),
    observacaoGeralQualidade: z.string().optional(),
    laudoTecnico: z.string().optional(),
    causaManutencao: z.string().optional(),
    inicioDiagnostico: z.any().nullable().optional(),
    fimDiagnostico: z.any().nullable().optional(),
    inicioManutencao: z.any().nullable().optional(),
    fimManutencao: z.any().nullable().optional(),
    dataFinalizacao: z.any().nullable().optional(),
    tempoRetrabalho: z.number().nullable().optional(),
    rodas: z.string().nullable().optional(),
  });

  app.patch("/api/os/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getOSById(id);
      if (!existing) {
        return res.status(404).json({ error: "OS não encontrada" });
      }
      
      const { id: _, ...bodyWithoutId } = req.body;
      
      // Log para debug do tempoRetrabalho
      if (bodyWithoutId.tempoRetrabalho !== undefined) {
        console.log(`[PATCH OS ${id}] tempoRetrabalho recebido:`, bodyWithoutId.tempoRetrabalho);
      }
      
      const parsed = updateOSSchema.safeParse(bodyWithoutId);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      // Capturar IP se houver mudança de responsável
      const data: Record<string, any> = { ...parsed.data };
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipStr = Array.isArray(clientIp) ? clientIp[0] : clientIp || "";

      if (data.responsavelDiagnosticoNome && !data.responsavelDiagnosticoIp) data.responsavelDiagnosticoIp = ipStr;
      if (data.responsavelManutencaoNome && !data.responsavelManutencaoIp) data.responsavelManutencaoIp = ipStr;
      if (data.responsavelQualidadeNome && !data.responsavelQualidadeIp) data.responsavelQualidadeIp = ipStr;

      // Converter strings de data para objetos Date (tratando null explicitamente)
      if (data.inicioDiagnostico !== undefined) {
        if (data.inicioDiagnostico === null) {
          data.inicioDiagnostico = null;
        } else if (typeof data.inicioDiagnostico === 'string') {
          data.inicioDiagnostico = new Date(data.inicioDiagnostico);
        }
      }
      if (data.fimDiagnostico !== undefined) {
        if (data.fimDiagnostico === null) {
          data.fimDiagnostico = null;
        } else if (typeof data.fimDiagnostico === 'string') {
          data.fimDiagnostico = new Date(data.fimDiagnostico);
        }
      }
      if (data.inicioManutencao !== undefined) {
        if (data.inicioManutencao === null) {
          data.inicioManutencao = null;
        } else if (typeof data.inicioManutencao === 'string') {
          data.inicioManutencao = new Date(data.inicioManutencao);
        }
      }
      if (data.fimManutencao !== undefined) {
        if (data.fimManutencao === null) {
          data.fimManutencao = null;
        } else if (typeof data.fimManutencao === 'string') {
          data.fimManutencao = new Date(data.fimManutencao);
        }
      }
      if (data.dataFinalizacao !== undefined) {
        if (data.dataFinalizacao === null) {
          data.dataFinalizacao = null;
        } else if (typeof data.dataFinalizacao === 'string') {
          data.dataFinalizacao = new Date(data.dataFinalizacao);
        } else if (data.dataFinalizacao instanceof Date) {
          // já é Date, mantém
        }
      }
      
      // Remover campos undefined para evitar erros no Drizzle
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }

      const os = await storage.updateOS(id, cleanData);
      const itens = await storage.getOSItens(id);
      res.json({ ...os, itens });
    } catch (error) {
      console.error("Erro ao atualizar OS:", error);
      res.status(500).json({ error: "Erro ao atualizar ordem de serviço" });
    }
  });

  app.delete("/api/os/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOS(id);
      if (!deleted) {
        return res.status(404).json({ error: "OS não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      res.status(500).json({ error: "Erro ao excluir ordem de serviço" });
    }
  });

  // === ITENS DA OS ===

  app.post("/api/os/:osId/itens", async (req, res) => {
    try {
      const osId = parseInt(req.params.osId);
      const os = await storage.getOSById(osId);
      if (!os) {
        return res.status(404).json({ error: "OS não encontrada" });
      }
      
      const { categoria, descricao, item, descricaoCustom, acao, tempoEstimado, inicioTimer } = req.body;
      if (!categoria || !descricao) {
        return res.status(400).json({ error: "Categoria e descrição são obrigatórios" });
      }
      
      const newItem = await storage.createOSItem({ 
        osId, 
        categoria, 
        descricao,
        item: item || null,
        descricaoCustom: descricaoCustom || null,
        acao: acao || null,
        tempoEstimado: tempoEstimado || null,
        inicioTimer: inicioTimer || null
      });
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Erro ao criar item:", error);
      res.status(500).json({ error: "Erro ao criar item" });
    }
  });

  const updateOSItemSchema = z.object({
    categoria: z.string().optional(),
    descricao: z.string().optional(),
    item: z.string().nullable().optional(),
    descricaoCustom: z.string().nullable().optional(),
    tempoEstimado: z.number().nullable().optional(),
    acao: z.string().nullable().optional(),
    observacao: z.string().nullable().optional(),
    inicioTimer: z.number().nullable().optional(),
    timerPausado: z.boolean().optional(),
    totalPausa: z.number().nullable().optional(),
    tempoExecutadoAntesAguardarPeca: z.number().nullable().optional(),
    tempoTotalAguardandoPeca: z.number().nullable().optional(),
    tempoExecutadoAntesAguardarAprovacao: z.number().nullable().optional(),
    tempoTotalAguardandoAprovacao: z.number().nullable().optional(),
    pecaSolicitada: z.string().nullable().optional(),
    aguardandoPeca: z.boolean().optional(),
    inicioAguardandoPeca: z.number().nullable().optional(),
    aguardandoAprovacao: z.boolean().optional(),
    inicioAguardandoAprovacao: z.number().nullable().optional(),
    motivoAprovacao: z.string().nullable().optional(),
    observacaoQualidade: z.string().nullable().optional(),
    fotoUrl: z.string().nullable().optional(),
    fotoDiagnostico: z.string().nullable().optional(),
    fotoQualidade: z.string().nullable().optional(),
    executado: z.boolean().optional(),
    executadoPorId: z.number().nullable().optional(),
    executadoPorNome: z.string().nullable().optional(),
    executadoPorIp: z.string().nullable().optional(),
  });

  app.patch("/api/os/:osId/itens/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const existing = await storage.getOSItemById(itemId);
      if (!existing) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      
      const { id: _, osId: __, ...bodyWithoutIds } = req.body;
      const parsed = updateOSItemSchema.safeParse(bodyWithoutIds);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      // Capturar IP se houver mudança de executor
      const data = { ...parsed.data };
      if (data.executadoPorNome && !data.executadoPorIp) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        data.executadoPorIp = Array.isArray(clientIp) ? clientIp[0] : clientIp || "";
      }

      const item = await storage.updateOSItem(itemId, data);
      res.json(item);
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      res.status(500).json({ error: "Erro ao atualizar item" });
    }
  });

  app.delete("/api/os/:osId/itens/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const deleted = await storage.deleteOSItem(itemId);
      if (!deleted) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      res.status(500).json({ error: "Erro ao excluir item" });
    }
  });

  // === HISTÓRICO DE ITENS ===

  app.get("/api/os/:osId/historico", async (req, res) => {
    try {
      const osId = parseInt(req.params.osId);
      const historico = await storage.getOSHistorico(osId);
      res.json(historico);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  app.get("/api/os/:osId/itens/:itemId/historico", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const historico = await storage.getOSItemHistorico(itemId);
      res.json(historico);
    } catch (error) {
      console.error("Erro ao buscar histórico do item:", error);
      res.status(500).json({ error: "Erro ao buscar histórico do item" });
    }
  });

  const createOSItemHistoricoSchema = z.object({
    osItemId: z.number(),
    osId: z.number(),
    tipo: z.string(),
    executadoPorId: z.number().nullable().optional(),
    executadoPorNome: z.string().nullable().optional(),
    executadoPorIp: z.string().nullable().optional(),
    tempoGasto: z.number().nullable().optional(),
    inicioTimer: z.number().nullable().optional(),
    fimTimer: z.number().nullable().optional(),
    resultado: z.string().nullable().optional(),
    observacao: z.string().nullable().optional(),
  });

  app.post("/api/os/:osId/itens/:itemId/historico", async (req, res) => {
    try {
      const parsed = createOSItemHistoricoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      // Capturar IP automaticamente
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipStr = Array.isArray(clientIp) ? clientIp[0] : clientIp || "";
      
      const data = {
        ...parsed.data,
        executadoPorIp: parsed.data.executadoPorIp || ipStr,
      };
      
      const historico = await storage.createOSItemHistorico(data);
      res.status(201).json(historico);
    } catch (error) {
      console.error("Erro ao criar histórico:", error);
      res.status(500).json({ error: "Erro ao criar histórico" });
    }
  });

  // === EMPRESAS E TRANSPORTADORAS ===

  app.get("/api/empresas", async (req, res) => {
    try {
      const lista = await storage.getAllEmpresas();
      res.json(lista);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      res.status(500).json({ error: "Erro ao buscar empresas" });
    }
  });

  app.get("/api/transportadoras", async (req, res) => {
    try {
      const lista = await storage.getAllTransportadoras();
      res.json(lista);
    } catch (error) {
      console.error("Erro ao buscar transportadoras:", error);
      res.status(500).json({ error: "Erro ao buscar transportadoras" });
    }
  });

  app.get("/api/veiculos", async (req, res) => {
    try {
      const lista = await storage.getAllVeiculos();
      res.json(lista);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      res.status(500).json({ error: "Erro ao buscar veículos" });
    }
  });

  // === VERIFICAR ACESSO ADMIN (TEMPORÁRIO) ===
  app.post("/api/admin/verificar-acesso", async (req, res) => {
    try {
      const { pin } = req.body;
      const funcionario = await storage.getFuncionarioByPin(pin);
      if (!funcionario || funcionario.id !== 39) {
        return res.status(403).json({ error: "Acesso negado. Apenas o administrador (Daniel) pode gerenciar as OS." });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar acesso" });
    }
  });

  // === DELETAR OS SELECIONADAS (TEMPORÁRIO) ===
  app.post("/api/admin/deletar-os", async (req, res) => {
    try {
      const { pin, osIds } = req.body;
      
      const funcionario = await storage.getFuncionarioByPin(pin);
      if (!funcionario || funcionario.id !== 39) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      if (!Array.isArray(osIds) || osIds.length === 0) {
        return res.status(400).json({ error: "Nenhuma OS selecionada." });
      }
      
      for (const id of osIds) {
        await storage.deleteOS(id);
      }
      
      res.json({ success: true, message: `${osIds.length} OS removida(s) com sucesso.` });
    } catch (error) {
      console.error("Erro ao deletar OS:", error);
      res.status(500).json({ error: "Erro ao deletar OS" });
    }
  });

  return httpServer;
}
