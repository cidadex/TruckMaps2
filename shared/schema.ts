import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, serial, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const funcionarios = pgTable("funcionarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  pin: varchar("pin", { length: 4 }).notNull().unique(),
  cargo: text("cargo").notNull(),
  permNovaOs: boolean("perm_nova_os").notNull().default(false),
  permDiagnostico: boolean("perm_diagnostico").notNull().default(false),
  permManutencao: boolean("perm_manutencao").notNull().default(false),
  permQualidade: boolean("perm_qualidade").notNull().default(false),
  permAguardandoPeca: boolean("perm_aguardando_peca").notNull().default(false),
  permAguardandoAprovacao: boolean("perm_aguardando_aprovacao").notNull().default(false),
  permAcompanharOs: boolean("perm_acompanhar_os").notNull().default(false),
  permLaudoTecnico: boolean("perm_laudo_tecnico").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
});

export const insertFuncionarioSchema = createInsertSchema(funcionarios).omit({
  id: true,
});

export type InsertFuncionario = z.infer<typeof insertFuncionarioSchema>;
export type Funcionario = typeof funcionarios.$inferSelect;

export const ordensServico = pgTable("ordens_servico", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull().unique(),
  placa: varchar("placa", { length: 10 }).notNull(),
  conjunto: text("conjunto").notNull(),
  empresa: text("empresa").notNull(),
  transportadora: text("transportadora").notNull(),
  responsavel: text("responsavel").notNull(),
  status: text("status").notNull().default("diagnostico"),
  codigoAcesso: varchar("codigo_acesso", { length: 10 }).notNull(),
  dataCriacao: timestamp("data_criacao").notNull().defaultNow(),
  responsavelDiagnosticoId: integer("responsavel_diagnostico_id"),
  responsavelDiagnosticoNome: text("responsavel_diagnostico_nome"),
  responsavelDiagnosticoIp: text("responsavel_diagnostico_ip"),
  inicioDiagnostico: timestamp("inicio_diagnostico"),
  fimDiagnostico: timestamp("fim_diagnostico"),
  responsavelManutencaoId: integer("responsavel_manutencao_id"),
  responsavelManutencaoNome: text("responsavel_manutencao_nome"),
  responsavelManutencaoIp: text("responsavel_manutencao_ip"),
  inicioManutencao: timestamp("inicio_manutencao"),
  fimManutencao: timestamp("fim_manutencao"),
  responsavelQualidadeId: integer("responsavel_qualidade_id"),
  responsavelQualidadeNome: text("responsavel_qualidade_nome"),
  responsavelQualidadeIp: text("responsavel_qualidade_ip"),
  observacaoGeralQualidade: text("observacao_geral_qualidade"),
  laudoTecnico: text("laudo_tecnico"),
  causaManutencao: text("causa_manutencao"),
  dataFinalizacao: timestamp("data_finalizacao"),
  tempoRetrabalho: integer("tempo_retrabalho").default(0),
  tipoConjunto: text("tipo_conjunto"),
  placa2: varchar("placa2", { length: 10 }),
  placa3: varchar("placa3", { length: 10 }),
  rodas: text("rodas"),
  mecanica: text("mecanica"),
  catracas: text("catracas"),
});

export const insertOSSchema = createInsertSchema(ordensServico).omit({
  id: true,
  dataCriacao: true,
});

export type InsertOS = z.infer<typeof insertOSSchema>;
export type OrdemServico = typeof ordensServico.$inferSelect;

export const osItens = pgTable("os_itens", {
  id: serial("id").primaryKey(),
  osId: integer("os_id").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  item: text("item"),
  descricaoCustom: text("descricao_custom"),
  tempoEstimado: integer("tempo_estimado"),
  acao: text("acao"),
  observacao: text("observacao"),
  inicioTimer: bigint("inicio_timer", { mode: "number" }),
  timerPausado: boolean("timer_pausado").default(false),
  inicioPausa: timestamp("inicio_pausa"),
  totalPausa: integer("total_pausa").default(0),
  pecaSolicitada: text("peca_solicitada"),
  aguardandoPeca: boolean("aguardando_peca").default(false),
  inicioAguardandoPeca: bigint("inicio_aguardando_peca", { mode: "number" }),
  tempoExecutadoAntesAguardarPeca: integer("tempo_executado_antes_aguardar_peca"),
  tempoTotalAguardandoPeca: integer("tempo_total_aguardando_peca"),
  aguardandoAprovacao: boolean("aguardando_aprovacao").default(false),
  inicioAguardandoAprovacao: bigint("inicio_aguardando_aprovacao", { mode: "number" }),
  tempoExecutadoAntesAguardarAprovacao: integer("tempo_executado_antes_aguardar_aprovacao"),
  tempoTotalAguardandoAprovacao: integer("tempo_total_aguardando_aprovacao"),
  motivoAprovacao: text("motivo_aprovacao"),
  observacaoQualidade: text("observacao_qualidade"),
  fotoUrl: text("foto_url"),
  fotoDiagnostico: text("foto_diagnostico"),
  fotoQualidade: text("foto_qualidade"),
  executado: boolean("executado").default(false),
  executadoPorId: integer("executado_por_id"),
  executadoPorNome: text("executado_por_nome"),
  executadoPorIp: text("executado_por_ip"),
});

export const insertOSItemSchema = createInsertSchema(osItens).omit({
  id: true,
});

export type InsertOSItem = z.infer<typeof insertOSItemSchema>;
export type OSItem = typeof osItens.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
});

export const insertEmpresaSchema = createInsertSchema(empresas).omit({ id: true });
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

export const transportadoras = pgTable("transportadoras", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
});

export const insertTransportadoraSchema = createInsertSchema(transportadoras).omit({ id: true });
export type InsertTransportadora = z.infer<typeof insertTransportadoraSchema>;
export type Transportadora = typeof transportadoras.$inferSelect;

export const veiculos = pgTable("veiculos", {
  id: serial("id").primaryKey(),
  placa: varchar("placa", { length: 10 }).notNull().unique(),
  tipo: text("tipo").notNull(),
  empresa: text("empresa").notNull(),
  status: text("status").notNull().default("Em Operação"),
  ultimaManutencao: timestamp("ultima_manutencao"),
  ativo: boolean("ativo").notNull().default(true),
});

export const insertVeiculoSchema = createInsertSchema(veiculos).omit({ id: true });
export type InsertVeiculo = z.infer<typeof insertVeiculoSchema>;
export type Veiculo = typeof veiculos.$inferSelect;

// Histórico de execuções de itens (para rastrear retrabalhos)
export const osItemHistorico = pgTable("os_item_historico", {
  id: serial("id").primaryKey(),
  osItemId: integer("os_item_id").notNull(),
  osId: integer("os_id").notNull(),
  tipo: text("tipo").notNull(), // "execucao", "qualidade", "solicitacao_aprovacao", "aprovacao"
  executadoPorId: integer("executado_por_id"),
  executadoPorNome: text("executado_por_nome"),
  executadoPorIp: text("executado_por_ip"),
  tempoGasto: integer("tempo_gasto"), // em segundos
  inicioTimer: bigint("inicio_timer", { mode: "number" }),
  fimTimer: bigint("fim_timer", { mode: "number" }),
  resultado: text("resultado"), // "conforme", "nao_conforme" (para qualidade)
  observacao: text("observacao"),
  dataRegistro: timestamp("data_registro").notNull().defaultNow(),
});

export const insertOSItemHistoricoSchema = createInsertSchema(osItemHistorico).omit({
  id: true,
  dataRegistro: true,
});

export type InsertOSItemHistorico = z.infer<typeof insertOSItemHistoricoSchema>;
export type OSItemHistorico = typeof osItemHistorico.$inferSelect;
