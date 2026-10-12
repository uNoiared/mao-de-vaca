/**
 * Parser de Extratos Bancários (OFX, CSV e Texto Copiado)
 * Especializado nos formatos brasileiros (Banco Inter, Nubank, Itaú, Bradesco, Santander, etc.)
 * Classifica com precisão:
 * - Tipo de transação (Entrada/Recebimento vs Saída/Gasto)
 * - Categoria (Comida, Lazer, Gastos Fixos, Transporte, Investimentos, Compras, etc.)
 * - Forma de pagamento
 */

class StatementParser {
  constructor() {
    this.expenseKeywords = [
      'enviad', 'envio pix', 'pix enviado', 'compra', 'debito', 'débito', 'deb.',
      'pagamento', 'pagto', 'pgto', 'pago', 'fatura', 'boleto', 'titulo',
      'saque', 'tarifa', 'taxa', 'anuidade', 'iof', 'juros', 'multa', 'recarga',
      'aplicacao', 'aplicação', 'aporte', 'ted enviada', 'doc enviado', 'deb aut', 'debito online td'
    ];

    this.incomeKeywords = [
      'recebid', 'recebimento', 'pix recebido', 'transferencia recebida', 'transf recebida',
      'ted recebida', 'doc recebido', 'salario', 'salário', 'proventos', 'folha de pagamento',
      'folha pagto', 'holerite', 'remuneracao', 'pro-labore', 'deposito', 'depósito',
      'rendimento', 'dividendo', 'juros sobre capital', 'jcp', 'cdi', 'resgate',
      'estorno', 'reembolso', 'devolucao', 'devolução', 'venda', 'comissao', 'comissão', 'cashback'
    ];

    this.categoryRules = {
      // 1. COMIDA & ALIMENTAÇÃO
      alimentacao: [
        'food', 'ifood', '99 food', 'restaurante', 'mcdonald', 'mc donals', 'burger', 'bk ',
        'padaria', 'panificadora', 'supermercado', 'mercado', 'carrefour', 'pao de acucar',
        'assai', 'atacadao', 'atacadista', 'tatico', 'hortifruti', 'sacolao', 'acougue',
        'bar', 'choperia', 'lanchonete', 'lancheteria', 'subway', 'pizza', 'pizzaria',
        'habib', 'ze delivery', 'cafeteria', 'starbucks', 'cafe', 'adega', 'emporio',
        'dupao', 'pao de queijo', 'divino fogao', 'dog do jorginho', 'hot dog', 'iceberghotdog',
        'varand', 'refeicao', 'arroz, feijao', 'pe efe', 'olimpo', 'distribuidorade',
        'imperador alvim', 'master pao', 'dona arniquerias', 'arniqueiras', 'apetite',
        'kiranaamir', 'ikaroferreirada', 'rodrigo sousa borges', 'rappi', 'aiqfome'
      ],

      // 2. TRANSPORTE & COMBUSTÍVEL
      transporte: [
        'combustivel', 'combustiveis', 'baratao', 'baratão', 'posto', 'gasolina', 'etanol',
        'diesel', 'abastece', 'uber', '99app', '99pop', '99 corrida', 'indrive', 'taxi',
        'ipiranga', 'shell', 'petrobras', 'sem parar', 'veloe', 'conectcar', 'pedagio',
        'estapar', 'estacionamento', 'oficina', 'mecanica', 'borracharia', 'ipva'
      ],

      // 3. GASTOS FIXOS & FATURAS / MORADIA
      moradia: [
        'fatura', 'pagamento fatura', 'aluguel', 'condominio', 'condomínio', 'imobiliaria',
        'enel', 'cemig', 'cpfl', 'sabesp', 'sanepar', 'copasa', 'comgas', 'energia', 'luz',
        'agua', 'água', 'iptu', 'claro', 'vivo', 'tim', 'oi fibra', 'internet', 'net servicos'
      ],

      // 4. INVESTIMENTOS & APLICAÇÕES / RESERVA
      investimentos: [
        'cdb', 'pos di', 'banco inter', 'aplicação', 'aplicacao', 'resgate', 'tesouro',
        'renda+', 'aposentadoria', 'debito online td', 'fii', 'ações', 'rendimento', 'dividendo',
        'xp investimentos', 'nu invest', 'btg'
      ],

      // 5. LAZER & ENTRETENIMENTO
      lazer: [
        'giftcard', 'xbox', 'playstation', 'psn', 'steam', 'nintendo', 'cinema', 'cinemark',
        'show', 'sympla', 'eventim', 'legends solution', 'teatro', 'jogos', 'game', 'viagem',
        'hotel', 'airbnb', 'booking', 'passagem aerea'
      ],

      // 6. COMPRAS & PRODUTOS
      compras: [
        'amazon', 'shpp', 'shopee', 'mercado livre', 'mercadolivre', 'aliexpress', 'shein',
        'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'zara', 'renner', 'c&a',
        'riachuelo', 'marketplace vendas', 'startimpressoese', 'smilein', 'maree', 'jim.com',
        'centauro', 'decathlon', 'nike', 'bcs - brasilia'
      ],

      // 7. SAÚDE & FARMÁCIA
      saude: [
        'farmacia', 'farmácia', 'droga raia', 'drogasil', 'pague menos', 'panvel',
        'ultrafarma', 'remedio', 'medicamento', 'hospital', 'consulta', 'medico',
        'dentista', 'odontologia', 'laboratorio', 'fleury', 'clinica', 'otica'
      ],

      // 8. ASSINATURAS & STREAMING
      assinaturas: [
        'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo max',
        'youtube', 'deezer', 'openai', 'chatgpt', 'adobe', 'apple.com', 'google play'
      ],

      // 9. EDUCAÇÃO
      educacao: [
        'curso', 'escola', 'colegio', 'faculdade', 'universidade', 'udemy', 'alura', 'livro'
      ],

      // RECEITAS / ENTRADAS ESPECÍFICAS
      salario: [
        'salario', 'salário', 'proventos', 'folha de pagamento', 'holerite', 'pro-labore'
      ],
      freelance: [
        'paypal', 'freelance', 'projeto', 'consultoria', 'honorarios', 'remittance', 'rendimento - pix remittance'
      ],
      cashback: [
        'cashback', 'reembolso', 'estorno'
      ],
      transferencias_recebidas: [
        'pix recebido', 'transferencia recebida', 'transf recebida', 'ted recebida', 'doc recebido'
      ],
      transferencias_pix: [
        'pix enviado', 'transferencia enviada'
      ]
    };
  }

  matchTerm(text, term) {
    if (!text || !term) return false;
    if (term.length <= 4) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      return regex.test(text);
    }
    return text.includes(term);
  }

  parseAmountData(valStr) {
    if (valStr === undefined || valStr === null) return { amount: NaN, isExplicitNegative: false, isExplicitPositive: false };
    let raw = valStr.toString().trim();
    if (!raw) return { amount: NaN, isExplicitNegative: false, isExplicitPositive: false };

    let isExplicitNegative = false;
    let isExplicitPositive = false;

    if (raw.includes('(') && raw.includes(')')) {
      isExplicitNegative = true;
      raw = raw.replace(/[()]/g, '').trim();
    }
    if (raw.endsWith('-')) {
      isExplicitNegative = true;
      raw = raw.slice(0, -1).trim();
    }
    if (raw.startsWith('-') || raw.includes(' -') || raw.includes('-R$') || raw.includes('R$-')) {
      isExplicitNegative = true;
      raw = raw.replace('-', '').trim();
    }
    if (raw.startsWith('+')) {
      isExplicitPositive = true;
      raw = raw.replace('+', '').trim();
    }

    let clean = raw.replace(/[R$r$\s]/g, '').replace(/[a-zA-Z]/g, '').trim();
    if (clean.includes(',') && !clean.includes('.')) {
      clean = clean.replace(',', '.');
    } else if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }

    const num = Math.abs(parseFloat(clean));
    return {
      amount: isNaN(num) ? NaN : num,
      isExplicitNegative,
      isExplicitPositive
    };
  }

  parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else current += char;
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  formatCSVDate(raw) {
    if (!raw) return new Date().toISOString().slice(0, 10);
    const clean = raw.trim();
    const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
    }
    const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    return new Date().toISOString().slice(0, 10);
  }

  // --- PARSE DE ARQUIVOS CSV OU TEXTO COPIADO ---
  parseCSV(content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // 1. LOCALIZAR A LINHA DE CABEÇALHO DA TABELA
    let headerLineIndex = -1;
    let delimiter = ';';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const countSemi = (line.match(/;/g) || []).length;
      const countComma = (line.match(/,/g) || []).length;
      const countTab = (line.match(/\t/g) || []).length;

      let lineDelim = ';';
      if (countComma > countSemi && countComma > countTab) lineDelim = ',';
      else if (countTab > countSemi && countTab > countComma) lineDelim = '\t';

      const parts = this.parseCSVLine(line, lineDelim).map(p => p.toLowerCase().trim());
      const hasDate = parts.some(p => p.includes('data') || p === 'dt' || p === 'date' || p.includes('dia'));
      const hasKey = parts.some(p => p.includes('valor') || p.includes('historico') || p.includes('histórico') || p.includes('descri') || p.includes('amount') || p.includes('saldo') || p.includes('debito') || p.includes('credito'));

      if (hasDate && hasKey && parts.length >= 2) {
        headerLineIndex = i;
        delimiter = lineDelim;
        break;
      }
    }

    let dateIdx = -1;
    let histIdx = -1;
    let descIdx = -1;
    let amountIdx = -1;
    let typeIdx = -1;
    let debitIdx = -1;
    let creditIdx = -1;
    let startIndex = 0;

    if (headerLineIndex !== -1) {
      const headers = this.parseCSVLine(lines[headerLineIndex], delimiter).map(h => h.toLowerCase().trim());
      dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('dia'));
      histIdx = headers.findIndex(h => h.includes('historico') || h.includes('histórico'));
      descIdx = headers.findIndex(h => h.includes('descri') || h.includes('memo') || h.includes('detalhe') || h.favorecido || h.includes('identificador'));
      debitIdx = headers.findIndex(h => h.includes('saida') || h.includes('saída') || h.includes('debito') || h.includes('débito') || h.includes('despesa'));
      creditIdx = headers.findIndex(h => h.includes('entrada') || h.includes('credito') || h.includes('crédito') || h.includes('receita'));
      amountIdx = headers.findIndex(h => (h.includes('valor') || h.includes('quantia') || h.includes('amount')) && !h.includes('saldo'));
      typeIdx = headers.findIndex(h => h === 'tipo' || h === 'type' || h.includes('d/c') || h.includes('dc') || h.includes('natureza'));

      startIndex = headerLineIndex + 1;
    } else {
      const firstLine = lines[0];
      if (firstLine.includes(';')) delimiter = ';';
      else if (firstLine.includes('\t')) delimiter = '\t';
      else delimiter = ',';

      dateIdx = 0;
      histIdx = 1;
      descIdx = 2;
      amountIdx = 3;
      startIndex = 0;
    }

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1 && histIdx !== -1) descIdx = histIdx;
    if (descIdx === -1) descIdx = 1;

    const transactions = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i], delimiter);
      if (cols.length < 2) continue;

      const rawDate = cols[dateIdx] || '';
      if (!/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(rawDate.trim()) && !/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(rawDate.trim())) {
        continue;
      }

      const rawHist = histIdx !== -1 ? (cols[histIdx] || '').trim() : '';
      const rawDesc = descIdx !== -1 ? (cols[descIdx] || '').trim() : '';

      let displayDesc = rawDesc || rawHist || 'Transação Bancária';
      if (rawHist && rawDesc && rawHist.toLowerCase() !== rawDesc.toLowerCase()) {
        displayDesc = `${rawDesc} (${rawHist})`;
      }

      const fullAnalysisText = `${rawHist} ${rawDesc}`.toLowerCase().trim();

      let cleanAmount = 0;
      let type = 'expense';
      let amtData = null;

      if (debitIdx !== -1 && creditIdx !== -1) {
        const dData = this.parseAmountData(cols[debitIdx]);
        const cData = this.parseAmountData(cols[creditIdx]);
        if (!isNaN(cData.amount) && cData.amount > 0) {
          type = 'income';
          cleanAmount = cData.amount;
        } else if (!isNaN(dData.amount) && dData.amount > 0) {
          type = 'expense';
          cleanAmount = dData.amount;
        } else {
          continue;
        }
      } else {
        const targetAmtIdx = amountIdx !== -1 ? amountIdx : (cols.length > 3 ? 3 : 2);
        const rawAmount = cols[targetAmtIdx] || '';
        amtData = this.parseAmountData(rawAmount);

        if (isNaN(amtData.amount) || amtData.amount === 0) continue;
        cleanAmount = amtData.amount;

        const explicitType = typeIdx !== -1 ? (cols[typeIdx] || '').toLowerCase() : '';

        if (explicitType.includes('c') || explicitType.includes('cred') || explicitType.includes('receita') || explicitType.includes('entrada')) {
          type = 'income';
        } else if (explicitType.includes('d') || explicitType.includes('deb') || explicitType.includes('despesa') || explicitType.includes('saida')) {
          type = 'expense';
        } else if (amtData.isExplicitNegative) {
          type = 'expense';
        } else if (amtData.isExplicitPositive) {
          type = 'income';
        } else if (this.incomeKeywords.some(t => this.matchTerm(fullAnalysisText, t))) {
          type = 'income';
        } else if (this.expenseKeywords.some(t => this.matchTerm(fullAnalysisText, t))) {
          type = 'expense';
        } else {
          type = 'expense';
        }
      }

      const categoryId = this.autoCategorize(fullAnalysisText, type);

      let paymentMethod = 'pix';
      if (fullAnalysisText.includes('pix')) paymentMethod = 'pix';
      else if (fullAnalysisText.includes('debito') || fullAnalysisText.includes('débito')) paymentMethod = 'debito';
      else if (fullAnalysisText.includes('credito') || fullAnalysisText.includes('crédito') || fullAnalysisText.includes('fatura')) paymentMethod = 'credito';
      else if (fullAnalysisText.includes('boleto')) paymentMethod = 'boleto';
      else if (fullAnalysisText.includes('ted') || fullAnalysisText.includes('doc') || fullAnalysisText.includes('transf')) paymentMethod = 'transferencia';

      transactions.push({
        id: `stmt_csv_${i}_${Date.now()}`,
        date: this.formatCSVDate(rawDate),
        description: displayDesc,
        amount: cleanAmount,
        type: type,
        categoryId: categoryId,
        paymentMethod: paymentMethod,
        status: 'completed',
        notes: rawHist ? `Histórico: ${rawHist}` : 'Extrato Bancário'
      });
    }

    return transactions;
  }

  // --- PARSE DE ARQUIVOS OFX ---
  parseOFX(content) {
    const transactions = [];
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const block = match[1];

      const trnType = this.extractTag(block, 'TRNTYPE').toUpperCase();
      const dtPosted = this.extractTag(block, 'DTPOSTED');
      const trnAmtRaw = this.extractTag(block, 'TRNAMT');
      const memo = this.extractTag(block, 'MEMO') || this.extractTag(block, 'NAME') || 'Transação Bancária';
      const fitId = this.extractTag(block, 'FITID') || `ofx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const amtData = this.parseAmountData(trnAmtRaw);
      if (isNaN(amtData.amount) || amtData.amount === 0) continue;

      let type = 'expense';
      const numRaw = parseFloat(trnAmtRaw.replace(',', '.'));

      if (trnType === 'CREDIT' || trnType === 'DEP' || trnType === 'INT' || trnType === 'DIV') {
        type = 'income';
      } else if (trnType === 'DEBIT' || trnType === 'PAYMENT' || trnType === 'CHECK' || trnType === 'FEE' || trnType === 'SRVCHG') {
        type = 'expense';
      } else if (!isNaN(numRaw)) {
        if (numRaw < 0) type = 'expense';
        else if (numRaw > 0) {
          type = this.incomeKeywords.some(t => this.matchTerm(memo.toLowerCase(), t)) ? 'income' : 'expense';
        }
      }

      const formattedDate = this.formatOFXDate(dtPosted);
      const categoryId = this.autoCategorize(memo.toLowerCase(), type);

      let paymentMethod = 'pix';
      const lowerMemo = memo.toLowerCase();
      if (lowerMemo.includes('pix')) paymentMethod = 'pix';
      else if (lowerMemo.includes('debito') || lowerMemo.includes('débito')) paymentMethod = 'debito';
      else if (lowerMemo.includes('credito') || lowerMemo.includes('crédito')) paymentMethod = 'credito';
      else if (lowerMemo.includes('boleto')) paymentMethod = 'boleto';
      else if (lowerMemo.includes('ted') || lowerMemo.includes('doc')) paymentMethod = 'transferencia';

      transactions.push({
        id: 'stmt_' + fitId,
        date: formattedDate,
        description: memo,
        amount: amtData.amount,
        type: type,
        categoryId: categoryId,
        paymentMethod: paymentMethod,
        status: 'completed',
        notes: `Extrato OFX (${trnType || 'TRN'})`
      });
    }

    return transactions;
  }

  autoCategorize(text, type) {
    if (type === 'income') {
      if (this.categoryRules.salario.some(t => this.matchTerm(text, t))) return 'salario';
      if (this.categoryRules.freelance.some(t => this.matchTerm(text, t))) return 'freelance';
      if (this.categoryRules.investimentos.some(t => this.matchTerm(text, t))) return 'investimentos';
      if (this.categoryRules.cashback.some(t => this.matchTerm(text, t))) return 'cashback';
      if (this.categoryRules.transferencias_recebidas.some(t => this.matchTerm(text, t))) return 'transferencias_recebidas';
      return 'outras_receitas';
    }

    // Despesas: ordem de prioridade
    const order = [
      'investimentos',
      'moradia',
      'alimentacao',
      'transporte',
      'saude',
      'assinaturas',
      'lazer',
      'educacao',
      'compras',
      'transferencias_pix'
    ];

    for (const catId of order) {
      if (this.categoryRules[catId].some(t => this.matchTerm(text, t))) {
        return catId;
      }
    }

    return 'outros_gastos';
  }

  extractTag(block, tag) {
    const regex = new RegExp(`<${tag}>([^<\r\n]+)`, 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : '';
  }

  formatOFXDate(raw) {
    if (!raw) return new Date().toISOString().slice(0, 10);
    const clean = raw.trim();
    if (clean.length >= 8) {
      const y = clean.substring(0, 4);
      const m = clean.substring(4, 6);
      const d = clean.substring(6, 8);
      return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().slice(0, 10);
  }

  // Gera dados com o modelo do Banco Inter
  generateDemoStatement() {
    return this.parseCSV(`Extrato Conta Corrente 
Conta ;75815753
Período ;15/07/2026 a 12/10/2026
Saldo ;143,75

Data Lançamento;Histórico;Descrição;Valor;Saldo
11/10/2026;Pix enviado ;99 Food Ltda;-34,85;143,75
10/10/2026;Pix recebido;Silvia Ferreira Pontes;2.000,00;178,60
10/10/2026;Aplicação;Cdb Pos Di Liq. Banco Inter S A;-180,00;-1.821,40
10/10/2026;Pix enviado ;Assai Atacadista;-1.897,96;-1.641,40
10/10/2026;Pix recebido;Silvia Ferreira Pontes;150,00;256,56
10/10/2026;Pagamento efetuado;Pagamento Fatura - THIAGO VINICIUS PONTES TEOFILO;-112,00;106,56
10/10/2026;Resgate;Cdb Pos Di Liq. Banco Inter S A;180,00;218,56
10/10/2026;Pix enviado ;Ifoodcom Agencia De Restaurantes Online Sa;-43,05;38,56
09/10/2026;Pix recebido;Paypal Do Brasil Instituicao De Pagamento Ltda;144,12;81,61
09/10/2026;Compra de Giftcard;;-100,00;-62,51
09/10/2026;Cashback;Xbox - 0bfb6f12-ecf4-47e0-86ad-b0f2b08f98e5;15,00;37,49
09/10/2026;Aplicação;Cdb Pos Di Liq. Banco Inter S A;-43,00;22,49
09/10/2026;Pix recebido;Silvia Ferreira Pontes;50,00;65,49
09/10/2026;Compra no débito;Dupao Paes E Convenie Brasilia     Bra;-108,63;15,49
08/10/2026;Pix recebido;Paypal Do Brasil Instituicao De Pagamento Ltda;395,04;124,12
08/10/2026;Compra no débito;Divino Fogao          Brasilia     Bra;-42,99;-270,92
08/10/2026;Pix enviado ;Legends Solution;-10,00;-227,93
08/10/2026;Aplicação;Cdb Pos Di Liq. Banco Inter S A;-300,00;-217,93
07/10/2026;Pix recebido;Banco Rendimento - Pix Remittance;24,92;82,07
06/10/2026;Pix enviado ;Marcelo Duarte De Macedo;-40,00;57,15
06/10/2026;Aplicação;Cdb Pos Di Liq. Banco Inter S A;-150,00;97,15
06/10/2026;Resgate;Cdb Pos Di Liq. Banco Inter S A;23,79;247,15
06/10/2026;Pagamento efetuado;Pagamento Fatura - THIAGO VINICIUS PONTES TEOFILO;-250,00;-2,85
05/10/2026;Pix recebido;Brayan Wisller Pontes Teofilo;200,00;247,15
03/10/2026;Pix enviado ;Baratao Combustiveis;-63,90;37,15
01/10/2026;Pix recebido;Paypal Do Brasil Instituicao De Pagamento Ltda;717,56;126,62
01/10/2026;Aplicação;Cdb Pos Di Liq. Banco Inter S A;-550,00;-590,94
01/10/2026;Debito Online Td;Prot.107798717 Renda+ Aposentadoria Extra 2065;-2,10;-40,94
01/10/2026;Pix enviado ;Maree Instituicao De Pagamento Ltda;-25,89;-38,84
01/10/2026;Compra no débito;Dona Arniquerias      Brasilia     Bra;-44,88;-12,95
01/10/2026;Compra no débito;B91*mais Pao De Queijobrasilia     Bra;-10,00;31,93
30/09/2026;Compra no débito;Mp *iceberghotdog     Santo Antoniobra;-38,00;41,93
29/09/2026;Compra no débito;B91*restaurante Varandbrasilia     Bra;-80,00;-0,07
28/09/2026;Pix enviado ;Baratao Combustiveis;-253,46;-120,07
26/09/2026;Compra no débito;Dona Arniquerias      Brasilia     Bra;-71,40;106,66
25/09/2026;Pix enviado ;Ifoodcom Agencia De Restaurantes Online Sa;-52,00;166,56
24/09/2026;Pix recebido;Paypal Do Brasil Instituicao De Pagamento Ltda;423,64;218,56
23/09/2026;Pix enviado ;Shpp Brasil Instituicao De Pag;-19,00;106,92
23/09/2026;Compra no débito;Dog Do Jorginho       Brasilia     Bra;-40,00;125,57
21/09/2026;Pagamento efetuado;Pagamento Fatura - THIAGO VINICIUS PONTES TEOFILO;-647,09;-638,78
15/09/2026;Compra no débito;Supermercado Tatico   Brasilia     Bra;-69,55;-67,76
11/09/2026;Compra no débito;Pe Efe Arroz, Feijao  Brasilia     Bra;-42,00;22,53
08/09/2026;Pix recebido;Silvia Ferreira Pontes;1.500,00;7,82
08/09/2026;Compra no débito;Supermercado Tatico   Brasilia     Bra;-1.313,83;-1.251,60
02/08/2026;Pix enviado ;Amazon Com Br;-19,00;72,14
19/07/2026;Compra no débito;Mc Donals              Brasilia      Bra;-27,90;247,75`);
  }
}

window.statementParser = new StatementParser();
