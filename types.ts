
export type StoreSection = 'cashier' | 'maintenance_pos' | 'inventory' | 'finance' | 'reports' | 'settings' | 'debts' | 'missing_goods';
export type AdminSection = 'control_panel' | 'subscription_global' | 'user_management' | 'system_logs';
export type Section = StoreSection | AdminSection;
export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER';
export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'locked';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  planId?: 'monthly' | 'semi-annual' | 'yearly';
  trialUsed: boolean;
}

export interface AppConfig {
  primaryColor: string;
  appName: string;
  version: string;
  maintenanceMode: boolean;
  globalMessage: string;
  themeMode: ThemeMode;
}

export interface Debt {
  id: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  remainingAmount: number;
  description: string;
  date: string;
  dueDate?: string;
  status: 'pending' | 'partially_paid' | 'paid';
  type: 'sale' | 'maintenance' | 'loan';
  shop_id: string;
}

export interface Product {
  id: string;
  name: string;
  price: number; 
  wholesale_price: number;
  cost: number;  
  category: 'phone' | 'charger' | 'cable' | 'wired_earphone' | 'bluetooth_earphone' | 'headphone' | 'accessory' | 'part' | 'electronic';
  stock: number;
  image?: string;
  shop_id: string;
}

export interface MaintenanceJob {
  id: string;
  customerName: string;
  customerPhone?: string;
  phoneModel: string;
  issue: string;
  notes?: string; 
  partsUsed?: string;
  missingParts?: string;
  cost: number;
  paidAmount: number; 
  status: 'pending' | 'in-progress' | 'completed' | 'delivered';
  date: string;
  shop_id: string;
}

export interface RechargeRule {
  label: string; 
  cardValue: number;
  costPrice: number;
}

export interface TransferSetting {
  operator: string;
  sendRate: number;        
  companyFeeRate?: number;
  companyFeeMax?: number;
  isSendTiered: boolean;   
  fixedFeeLow: number;     
  fixedFeeHigh: number;    
  feeThreshold: number;    
  receiveRate: number;
  rechargeRules: RechargeRule[];
  creditMultiplier: number; 
}

export interface Transaction {
  id: string;
  type: 'sale' | 'maintenance' | 'transfer' | 'expense' | 'income' | 'debt_payment';
  medium: 'cash' | 'wallet'; 
  amount: number;         
  cost?: number;          
  profit?: number;        
  description: string;
  date: string;
  category?: string;
  shop_id: string;
  cashier_name?: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  subscription: SubscriptionInfo;
  config: AppConfig;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'rent' | 'electricity' | 'salary' | 'other';
  shop_id: string;
}

export interface PaymentService {
  id: string;
  name: string;
  icon?: string;
  type: 'category' | 'operator' | 'plan_list' | 'direct_form';
  parentId?: string;
  color?: string;
  plans?: { label: string; price: number; cost: number }[];
}
