import { 
  type User, type InsertUser, 
  type Funcionario, type InsertFuncionario, 
  type OrdemServico, type InsertOS,
  type OSItem, type InsertOSItem,
  type Empresa, type Transportadora,
  type Veiculo, type InsertVeiculo,
  type OSItemHistorico, type InsertOSItemHistorico,
  users, funcionarios, ordensServico, osItens, empresas, transportadoras, veiculos, osItemHistorico 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllFuncionarios(): Promise<Funcionario[]>;
  getFuncionarioById(id: number): Promise<Funcionario | undefined>;
  getFuncionarioByPin(pin: string): Promise<Funcionario | undefined>;
  createFuncionario(funcionario: InsertFuncionario): Promise<Funcionario>;
  updateFuncionario(id: number, funcionario: Partial<InsertFuncionario>): Promise<Funcionario | undefined>;
  deleteFuncionario(id: number): Promise<boolean>;
  
  getAllOS(): Promise<OrdemServico[]>;
  getOSById(id: number): Promise<OrdemServico | undefined>;
  getOSByNumero(numero: number): Promise<OrdemServico | undefined>;
  getOSByPlacaAndCodigo(placa: string, codigo: string): Promise<OrdemServico | undefined>;
  getOSByPlaca(placa: string): Promise<OrdemServico | undefined>;
  getOSByStatus(status: string): Promise<OrdemServico[]>;
  getOSByEmpresa(empresa: string): Promise<OrdemServico[]>;
  getNextOSNumero(): Promise<number>;
  createOS(os: InsertOS): Promise<OrdemServico>;
  updateOS(id: number, os: Partial<InsertOS>): Promise<OrdemServico | undefined>;
  deleteOS(id: number): Promise<boolean>;
  
  getOSItens(osId: number): Promise<OSItem[]>;
  getOSItemById(id: number): Promise<OSItem | undefined>;
  createOSItem(item: InsertOSItem): Promise<OSItem>;
  createOSItens(items: InsertOSItem[]): Promise<OSItem[]>;
  updateOSItem(id: number, item: Partial<InsertOSItem>): Promise<OSItem | undefined>;
  deleteOSItem(id: number): Promise<boolean>;
  
  getAllEmpresas(): Promise<Empresa[]>;
  getAllTransportadoras(): Promise<Transportadora[]>;

  getAllVeiculos(): Promise<Veiculo[]>;
  getVeiculoByPlaca(placa: string): Promise<Veiculo | undefined>;
  createVeiculo(veiculo: InsertVeiculo): Promise<Veiculo>;
  updateVeiculo(id: number, veiculo: Partial<InsertVeiculo>): Promise<Veiculo | undefined>;
  
  deleteAllOS(): Promise<void>;
  
  // Histórico de execuções
  getOSItemHistorico(osItemId: number): Promise<OSItemHistorico[]>;
  getOSHistorico(osId: number): Promise<OSItemHistorico[]>;
  createOSItemHistorico(historico: InsertOSItemHistorico): Promise<OSItemHistorico>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllFuncionarios(): Promise<Funcionario[]> {
    return db.select().from(funcionarios).orderBy(funcionarios.nome);
  }

  async getFuncionarioById(id: number): Promise<Funcionario | undefined> {
    const [funcionario] = await db.select().from(funcionarios).where(eq(funcionarios.id, id));
    return funcionario;
  }

  async getFuncionarioByPin(pin: string): Promise<Funcionario | undefined> {
    const [funcionario] = await db.select().from(funcionarios).where(eq(funcionarios.pin, pin));
    return funcionario;
  }

  async createFuncionario(funcionario: InsertFuncionario): Promise<Funcionario> {
    const [created] = await db.insert(funcionarios).values(funcionario).returning();
    return created;
  }

  async updateFuncionario(id: number, data: Partial<InsertFuncionario>): Promise<Funcionario | undefined> {
    const [updated] = await db.update(funcionarios).set(data).where(eq(funcionarios.id, id)).returning();
    return updated;
  }

  async deleteFuncionario(id: number): Promise<boolean> {
    const result = await db.delete(funcionarios).where(eq(funcionarios.id, id)).returning();
    return result.length > 0;
  }

  async getAllOS(): Promise<OrdemServico[]> {
    return db.select().from(ordensServico).orderBy(desc(ordensServico.numero));
  }

  async getOSById(id: number): Promise<OrdemServico | undefined> {
    const [os] = await db.select().from(ordensServico).where(eq(ordensServico.id, id));
    return os;
  }

  async getOSByNumero(numero: number): Promise<OrdemServico | undefined> {
    const [os] = await db.select().from(ordensServico).where(eq(ordensServico.numero, numero));
    return os;
  }

  async getOSByPlacaAndCodigo(placa: string, codigo: string): Promise<OrdemServico | undefined> {
    const [os] = await db.select().from(ordensServico).where(
      and(eq(ordensServico.placa, placa.toUpperCase()), eq(ordensServico.codigoAcesso, codigo))
    );
    return os;
  }

  async getOSByPlaca(placa: string): Promise<OrdemServico | undefined> {
    const [os] = await db.select().from(ordensServico).where(
      eq(ordensServico.placa, placa.toUpperCase())
    ).orderBy(desc(ordensServico.id)).limit(1);
    return os;
  }

  async getOSByStatus(status: string): Promise<OrdemServico[]> {
    return db.select().from(ordensServico).where(eq(ordensServico.status, status)).orderBy(desc(ordensServico.numero));
  }

  async getOSByEmpresa(empresa: string): Promise<OrdemServico[]> {
    return db.select().from(ordensServico).where(eq(ordensServico.empresa, empresa)).orderBy(desc(ordensServico.numero));
  }

  async getNextOSNumero(): Promise<number> {
    const result = await db.select({ numero: ordensServico.numero }).from(ordensServico).orderBy(desc(ordensServico.numero)).limit(1);
    return result.length > 0 ? result[0].numero + 1 : 1001;
  }

  async createOS(os: InsertOS): Promise<OrdemServico> {
    const [created] = await db.insert(ordensServico).values(os).returning();
    return created;
  }

  async updateOS(id: number, data: Partial<InsertOS>): Promise<OrdemServico | undefined> {
    // Ensure nested objects are handled if passed as strings (though Drizzle usually handles this if types match)
    const [updated] = await db.update(ordensServico).set(data).where(eq(ordensServico.id, id)).returning();
    return updated;
  }

  async deleteOS(id: number): Promise<boolean> {
    await db.delete(osItens).where(eq(osItens.osId, id));
    const result = await db.delete(ordensServico).where(eq(ordensServico.id, id)).returning();
    return result.length > 0;
  }

  async getOSItens(osId: number): Promise<OSItem[]> {
    return db.select().from(osItens).where(eq(osItens.osId, osId));
  }

  async getOSItemById(id: number): Promise<OSItem | undefined> {
    const [item] = await db.select().from(osItens).where(eq(osItens.id, id));
    return item;
  }

  async createOSItem(item: InsertOSItem): Promise<OSItem> {
    const [created] = await db.insert(osItens).values(item).returning();
    return created;
  }

  async createOSItens(items: InsertOSItem[]): Promise<OSItem[]> {
    if (items.length === 0) return [];
    return db.insert(osItens).values(items).returning();
  }

  async updateOSItem(id: number, data: Partial<InsertOSItem>): Promise<OSItem | undefined> {
    const [updated] = await db.update(osItens).set(data).where(eq(osItens.id, id)).returning();
    return updated;
  }

  async deleteOSItem(id: number): Promise<boolean> {
    const result = await db.delete(osItens).where(eq(osItens.id, id)).returning();
    return result.length > 0;
  }

  async getAllEmpresas(): Promise<Empresa[]> {
    return db.select().from(empresas).where(eq(empresas.ativo, true)).orderBy(empresas.nome);
  }

  async getAllTransportadoras(): Promise<Transportadora[]> {
    return db.select().from(transportadoras).where(eq(transportadoras.ativo, true)).orderBy(transportadoras.nome);
  }

  async getAllVeiculos(): Promise<Veiculo[]> {
    return db.select().from(veiculos).where(eq(veiculos.ativo, true)).orderBy(veiculos.placa);
  }

  async getVeiculoByPlaca(placa: string): Promise<Veiculo | undefined> {
    const [veiculo] = await db.select().from(veiculos).where(eq(veiculos.placa, placa.toUpperCase()));
    return veiculo;
  }

  async createVeiculo(veiculo: InsertVeiculo): Promise<Veiculo> {
    const [created] = await db.insert(veiculos).values(veiculo).returning();
    return created;
  }

  async updateVeiculo(id: number, data: Partial<InsertVeiculo>): Promise<Veiculo | undefined> {
    const [updated] = await db.update(veiculos).set(data).where(eq(veiculos.id, id)).returning();
    return updated;
  }

  async deleteAllOS(): Promise<void> {
    // Primeiro deletar histórico
    await db.delete(osItemHistorico);
    // Depois deletar todos os itens das OS
    await db.delete(osItens);
    // Depois deletar todas as OS
    await db.delete(ordensServico);
  }

  async getOSItemHistorico(osItemId: number): Promise<OSItemHistorico[]> {
    return db.select().from(osItemHistorico).where(eq(osItemHistorico.osItemId, osItemId)).orderBy(osItemHistorico.dataRegistro);
  }

  async getOSHistorico(osId: number): Promise<OSItemHistorico[]> {
    return db.select().from(osItemHistorico).where(eq(osItemHistorico.osId, osId)).orderBy(osItemHistorico.dataRegistro);
  }

  async createOSItemHistorico(historico: InsertOSItemHistorico): Promise<OSItemHistorico> {
    const [created] = await db.insert(osItemHistorico).values(historico).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
