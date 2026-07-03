// Mock Data Generator for Financial Dashboard
// Represents a company's transactions log for Jan 2026 - Jun 2026

export const ACCOUNTS = {
  ALFA: "Р/С Альфа-Банк",
  SBER: "Р/С Сбербанк",
  CASH: "Касса Офис"
};

export const CATEGORIES = {
  // Income
  REVENUE_GOODS: "Выручка: Продажи товаров",
  REVENUE_SERVICES: "Выручка: Услуги консалтинга",
  REVENUE_LICENSE: "Выручка: Лицензии ПО",
  
  // COGS (Cost of Goods Sold)
  COGS_RAW: "Себестоимость: Закупки сырья",
  COGS_DELIVERY: "Себестоимость: Логистика и доставка",
  
  // OPEX (Operating Expenses)
  OPEX_SALARIES: "ОПЕКС: Заработная плата",
  OPEX_RENT: "ОПЕКС: Аренда офиса",
  OPEX_MARKETING: "ОПЕКС: Маркетинг и реклама",
  OPEX_SOFTWARE: "ОПЕКС: Софт и облако",
  OPEX_UTILITIES: "ОПЕКС: Коммунальные платежи",
  
  // Financing/Investing/Other
  FIN_LOAN_IN: "Фин: Получение кредита",
  FIN_LOAN_OUT: "Фин: Погашение тела кредита",
  FIN_INTEREST: "Фин: Выплата процентов",
  INV_EQUIPMENT: "Инвест: Покупка оборудования",
  TAX_INCOME: "Налог на прибыль",
  TAX_VAT: "НДС"
};

export const CATEGORY_TYPES = {
  [CATEGORIES.REVENUE_GOODS]: "Income",
  [CATEGORIES.REVENUE_SERVICES]: "Income",
  [CATEGORIES.REVENUE_LICENSE]: "Income",
  [CATEGORIES.COGS_RAW]: "COGS",
  [CATEGORIES.COGS_DELIVERY]: "COGS",
  [CATEGORIES.OPEX_SALARIES]: "Expense",
  [CATEGORIES.OPEX_RENT]: "Expense",
  [CATEGORIES.OPEX_MARKETING]: "Expense",
  [CATEGORIES.OPEX_SOFTWARE]: "Expense",
  [CATEGORIES.OPEX_UTILITIES]: "Expense",
  [CATEGORIES.FIN_LOAN_IN]: "Financing_In",
  [CATEGORIES.FIN_LOAN_OUT]: "Financing_Out",
  [CATEGORIES.FIN_INTEREST]: "Expense_Fin",
  [CATEGORIES.INV_EQUIPMENT]: "Investing_Out",
  [CATEGORIES.TAX_INCOME]: "Tax",
  [CATEGORIES.TAX_VAT]: "Tax"
};

export const COUNTERPARTIES = {
  CLIENT_ROMASHKA: "ООО Ромашка (Клиент)",
  CLIENT_VEKTOR: "АО Вектор (Клиент)",
  SUPPLIER_STEEL: "ООО СеверСтальСервис (Поставщик)",
  SUPPLIER_LOGISTICS: "ООО БыстраяДоставка",
  LANDLORD: "ИП Черных (Арендодатель)",
  BANK_SBER: "ПАО Сбербанк",
  TAX_OFFICE: "ФНС России",
  YANDEX: "ООО Яндекс.Директ",
  EMPLOYEES: "Сотрудники (ФОТ)",
  UNKNOWN: ""
};

// Initial starting balances as of Jan 1, 2026
export const INITIAL_BALANCES = {
  [ACCOUNTS.ALFA]: 1200000,
  [ACCOUNTS.SBER]: 850000,
  [ACCOUNTS.CASH]: 50000
};

// Base transactions list
const rawTransactions = [
  // --- JANUARY 2026 ---
  { date: "2026-01-05", type: "Income", amount: 450000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Оплата по договору поставки товаров №45" },
  { date: "2026-01-10", type: "Expense", amount: 150000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Закупка металлопроката, партия 1" },
  { date: "2026-01-10", type: "Expense", amount: 20000, category: CATEGORIES.COGS_DELIVERY, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_LOGISTICS, description: "Доставка сырья на склад" },
  { date: "2026-01-15", type: "Expense", amount: 350000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "Аванс и ЗП за первую половину января" },
  { date: "2026-01-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офисного помещения за январь" },
  { date: "2026-01-22", type: "Income", amount: 300000, category: CATEGORIES.REVENUE_SERVICES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.CLIENT_VEKTOR, description: "Консалтинговые услуги по аудиту процессов" },
  { date: "2026-01-25", type: "Expense", amount: 50000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Рекламный бюджет Яндекс Директ" },
  { date: "2026-01-28", type: "Expense", amount: 15000, category: CATEGORIES.OPEX_SOFTWARE, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.BANK_SBER, description: "Подписка на 1С и офисные программы" },
  { date: "2026-01-29", type: "Expense", amount: 8000, category: CATEGORIES.OPEX_UTILITIES, account: ACCOUNTS.CASH, counterparty: COUNTERPARTIES.LANDLORD, description: "Оплата электроэнергии по счетчику" },

  // --- FEBRUARY 2026 ---
  { date: "2026-02-05", type: "Income", amount: 520000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Оплата товаров по счету №52" },
  { date: "2026-02-08", type: "Expense", amount: 180000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Поставка сырья партия 2" },
  { date: "2026-02-12", type: "Expense", amount: 25000, category: CATEGORIES.COGS_DELIVERY, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_LOGISTICS, description: "Доставка сырья на склад Feb" },
  { date: "2026-02-15", type: "Expense", amount: 350000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "ЗП за январь вторая часть" },
  { date: "2026-02-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса за февраль" },
  { date: "2026-02-22", type: "Income", amount: 120000, category: CATEGORIES.REVENUE_LICENSE, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.CLIENT_VEKTOR, description: "Лицензии на аналитическую панель" },
  { date: "2026-02-25", type: "Expense", amount: 70000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Реклама Яндекс Директ февраль" },
  { date: "2026-02-27", type: "Expense", amount: 50000, category: CATEGORIES.TAX_INCOME, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.TAX_OFFICE, description: "Авансовый платеж по налогу на прибыль за 4 кв" },

  // --- MARCH 2026 ---
  { date: "2026-03-05", type: "Income", amount: 600000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Оплата по договору поставки №60" },
  { date: "2026-03-10", type: "Expense", amount: 220000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Закупка сырья март" },
  { date: "2026-03-15", type: "Expense", amount: 370000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "ЗП февраль" },
  { date: "2026-03-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса за март" },
  { date: "2026-03-22", type: "Income", amount: 200000, category: CATEGORIES.REVENUE_SERVICES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.CLIENT_VEKTOR, description: "Консалтинговый проект этап 2" },
  { date: "2026-03-23", type: "Income", amount: 1500000, category: CATEGORIES.FIN_LOAN_IN, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Получение целевого кредита на развитие" },
  { date: "2026-03-25", type: "Expense", amount: 450000, category: CATEGORIES.INV_EQUIPMENT, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Покупка нового токарного станка с ЧПУ" },
  { date: "2026-03-28", type: "Expense", amount: 120000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Рекламная кампания весенняя" },

  // --- APRIL 2026 ---
  { date: "2026-04-06", type: "Income", amount: 750000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Оплата по договору поставки товаров №70" },
  { date: "2026-04-10", type: "Expense", amount: 250000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Крупная закупка сырья на склад" },
  { date: "2026-04-12", type: "Expense", amount: 35000, category: CATEGORIES.COGS_DELIVERY, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_LOGISTICS, description: "Доставка сырья апрель" },
  { date: "2026-04-15", type: "Expense", amount: 390000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "Выплата ЗП за март" },
  { date: "2026-04-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса апрель" },
  { date: "2026-04-25", type: "Expense", amount: 100000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Яндекс Директ апрель" },
  { date: "2026-04-28", type: "Expense", amount: 50000, category: CATEGORIES.FIN_LOAN_OUT, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Погашение основного долга по кредиту" },
  { date: "2026-04-28", type: "Expense", amount: 15000, category: CATEGORIES.FIN_INTEREST, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Выплата процентов по кредиту" },

  // --- MAY 2026 ---
  { date: "2026-05-05", type: "Income", amount: 800000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Оплата по счету поставки №82" },
  { date: "2026-05-08", type: "Expense", amount: 280000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Сырье поставка май" },
  { date: "2026-05-15", type: "Expense", amount: 410000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "ЗП за апрель ФОТ" },
  { date: "2026-05-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса май" },
  { date: "2026-05-22", type: "Income", amount: 350000, category: CATEGORIES.REVENUE_SERVICES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.CLIENT_VEKTOR, description: "Оплата за консалтинг этап 3" },
  { date: "2026-05-25", type: "Expense", amount: 110000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Яндекс Директ май" },
  { date: "2026-05-28", type: "Expense", amount: 50000, category: CATEGORIES.FIN_LOAN_OUT, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Погашение основного долга май" },
  { date: "2026-05-28", type: "Expense", amount: 14500, category: CATEGORIES.FIN_INTEREST, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Выплата процентов май" },

  // --- JUNE 2026 ---
  { date: "2026-06-05", type: "Income", amount: 950000, category: CATEGORIES.REVENUE_GOODS, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.CLIENT_ROMASHKA, description: "Финальная оплата поставки товаров" },
  { date: "2026-06-08", type: "Expense", amount: 300000, category: CATEGORIES.COGS_RAW, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_STEEL, description: "Сырье июнь крупная партия" },
  { date: "2026-06-12", type: "Expense", amount: 40000, category: CATEGORIES.COGS_DELIVERY, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.SUPPLIER_LOGISTICS, description: "Логистические расходы июнь" },
  { date: "2026-06-15", type: "Expense", amount: 420000, category: CATEGORIES.OPEX_SALARIES, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.EMPLOYEES, description: "ЗП май" },
  { date: "2026-06-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса июнь" },
  { date: "2026-06-25", type: "Expense", amount: 130000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Маркетинг Яндекс июнь" },
  { date: "2026-06-28", type: "Expense", amount: 50000, category: CATEGORIES.FIN_LOAN_OUT, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Погашение основного долга июнь" },
  { date: "2026-06-28", type: "Expense", amount: 14000, category: CATEGORIES.FIN_INTEREST, account: ACCOUNTS.SBER, counterparty: COUNTERPARTIES.BANK_SBER, description: "Выплата процентов июнь" },
  { date: "2026-06-30", type: "Expense", amount: 65000, category: CATEGORIES.TAX_INCOME, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.TAX_OFFICE, description: "Авансовый платеж по налогу на прибыль за 1 кв 2026" },

  // --- INTENTIONAL AUDIT ERRORS INTRODUCED FOR THE SYSTEM TO FIND ---
  
  // 1. Double transaction (Duplicate)
  { date: "2026-04-20", type: "Expense", amount: 80000, category: CATEGORIES.OPEX_RENT, account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.LANDLORD, description: "Аренда офиса апрель" }, // DUPLICATE of rent on 2026-04-20
  
  // 2. Transaction with missing category
  { date: "2026-05-18", type: "Expense", amount: 12000, category: "", account: ACCOUNTS.ALFA, counterparty: COUNTERPARTIES.YANDEX, description: "Оплата продвижения в соцсетях без классификации" },

  // 3. Transaction with missing counterparty
  { date: "2026-03-12", type: "Income", amount: 45000, category: CATEGORIES.REVENUE_SERVICES, account: ACCOUNTS.CASH, counterparty: "", description: "Наличная оплата за разовый консалтинг от физлица" },

  // 4. Critical balance error (Cash account goes negative on June 22 due to large cash expense)
  { date: "2026-06-22", type: "Expense", amount: 120000, category: CATEGORIES.OPEX_MARKETING, account: ACCOUNTS.CASH, counterparty: COUNTERPARTIES.YANDEX, description: "Срочный кэш-платеж на печать буклетов для выставки" },
];

export const getTransactions = () => {
  return rawTransactions.map((tx, idx) => ({
    id: `tx-${idx + 1}`,
    ...tx
  }));
};

// Mock External Statement from Counterparty for Reconciliation (Акт Сверки)
// We will mock the registry of ООО Ромашка (Client)
// They will have a slightly different log to show discrepancies:
// - One transaction has a different amount (950k vs 940k)
// - One transaction is missing in their system
export const getRomashkaExternalStatement = () => {
  return [
    { date: "2026-01-05", docNum: "P-45", debit: 450000, credit: 0, description: "Поступление товара по договору №45" },
    { date: "2026-01-05", docNum: "Bank-12", debit: 0, credit: 450000, description: "Оплата по договору №45" },
    
    { date: "2026-02-05", docNum: "P-52", debit: 520000, credit: 0, description: "Поступление товара по счету №52" },
    { date: "2026-02-05", docNum: "Bank-87", debit: 0, credit: 520000, description: "Оплата товаров по счету №52" },
    
    { date: "2026-03-05", docNum: "P-60", debit: 600000, credit: 0, description: "Поставка товара №60" },
    { date: "2026-03-05", docNum: "Bank-192", debit: 0, credit: 600000, description: "Оплата по договору №60" },
    
    { date: "2026-04-06", docNum: "P-70", debit: 750000, credit: 0, description: "Товарная накладная №70" },
    { date: "2026-04-06", docNum: "Bank-221", debit: 0, credit: 750000, description: "Оплата по договору №70" },
    
    { date: "2026-05-05", docNum: "P-82", debit: 800000, credit: 0, description: "Поставка по счету №82" },
    { date: "2026-05-05", docNum: "Bank-304", debit: 0, credit: 800000, description: "Оплата по счету №82" },
    
    // Discrepancy 1: June transaction has a different amount in Romashka's ledger (940,000 instead of 950,000)
    { date: "2026-06-05", docNum: "P-90", debit: 940000, credit: 0, description: "Накладная финальная поставка" },
    { date: "2026-06-05", docNum: "Bank-440", debit: 0, credit: 940000, description: "Оплата финальной поставки" },
    
    // Discrepancy 2: Romashka paid 15,000 for something in June, which is NOT in our sheets!
    { date: "2026-06-18", docNum: "Bank-488", debit: 0, credit: 15000, description: "Доплата за тару по доп. соглашению" }
  ];
};

// Sheets Layout Structure for Graph View
export const GOOGLE_SHEETS_SCHEMA = {
  spreadsheetId: "1fHwYmN4v9B3o-K-d3g8L_f4H_jR8K5s2lO9kX7m1a8Y",
  title: "Финансовый Учет 2026",
  sheets: [
    {
      name: "Операции (Transactions)",
      description: "Все фактические платежи и начисления компании",
      columns: [
        { name: "Дата (Date)", type: "Date", description: "Дата совершения платежа" },
        { name: "Тип (Type)", type: "String", description: "Income (Поступление) или Expense (Расход)" },
        { name: "Сумма (Amount)", type: "Number", description: "Сумма операции в рублях" },
        { name: "Статья (Category)", type: "String", description: "Категория доходов или расходов" },
        { name: "Счет (Account)", type: "String", description: "Расчетный счет банка или касса" },
        { name: "Контрагент (Counterparty)", type: "String", description: "Клиент, партнер или поставщик" },
        { name: "Описание (Description)", type: "String", description: "Детали назначения платежа" }
      ]
    },
    {
      name: "Справочник Статей (Categories)",
      description: "Настройка дерева статей и структуры PnL / Cash Flow",
      columns: [
        { name: "Статья (Category)", type: "String", description: "Название категории" },
        { name: "Тип отчета (Report)", type: "String", description: "Income / COGS / Expense / Investing / Financing" },
        { name: "Группа PnL (PnL Group)", type: "String", description: "Группа в структуре PnL" }
      ]
    },
    {
      name: "Остатки (Balances)",
      description: "Начальные остатки по расчетным счетам на начало года",
      columns: [
        { name: "Счет (Account)", type: "String", description: "Название счета" },
        { name: "Начальное Сальдо (Starting Balance)", type: "Number", description: "Сумма в рублях на 01.01.2026" }
      ]
    }
  ]
};
