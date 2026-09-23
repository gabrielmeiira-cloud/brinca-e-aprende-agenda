/**
 * Storage Service - Brinca e Aprende Agenda Berçário
 * Gerencia persistência local (localStorage) de crianças, rotinas diárias e estoque de higiene.
 */

const STORAGE_KEYS = {
  CHILDREN: 'brinca_aprende_children',
  ROUTINES: 'brinca_aprende_routines',
  CURRENT_USER: 'brinca_aprende_current_user',
  USERS: 'brinca_aprende_registered_users'
};

// Crianças pré-cadastradas para o berçário
const INITIAL_CHILDREN = [
  {
    id: 'child_1',
    name: 'Theo Oliveira',
    age: '1 ano e 2 meses',
    turma: 'Berçário 1',
    avatar: '👶',
    parentEmail: 'pais.theo@gmail.com',
    responsible: 'Mariana Oliveira (Mãe)'
  },
  {
    id: 'child_2',
    name: 'Helena Santos',
    age: '10 meses',
    turma: 'Berçário 1',
    avatar: '👧',
    parentEmail: 'pais.helena@gmail.com',
    responsible: 'Lucas Santos (Pai)'
  },
  {
    id: 'child_3',
    name: 'Noah Gabriel',
    age: '1 ano e 5 meses',
    turma: 'Berçário 2',
    avatar: '🧒',
    parentEmail: 'pais.noah@gmail.com',
    responsible: 'Camila Gabriel (Mãe)'
  },
  {
    id: 'child_4',
    name: 'Alice Souza',
    age: '8 meses',
    turma: 'Berçário 1',
    avatar: '🍼',
    parentEmail: 'pais.alice@gmail.com',
    responsible: 'Renata Souza (Mãe)'
  }
];

// Modelo padrão de rotina diária
function getDefaultRoutine(childId, dateStr) {
  return {
    childId: childId,
    date: dateStr,
    hygiene: {
      pomada: { ok: true, name: 'Pomada' },
      fralda: { ok: true, name: 'Fralda' },
      lenco: { ok: true, name: 'Lenço Umedecido' },
      shampoo: { ok: true, name: 'Shampoo' },
      condicionador: { ok: true, name: 'Condicionador' },
      sabonete: { ok: true, name: 'Sabonete' },
      faltaObservacao: ''
    },
    meals: [
      { id: 'm1', name: 'Café da manhã', time: '08:00', icon: '☀️', acceptance: 'otimo', description: 'Frutinha (mamão) e mingau de aveia' },
      { id: 'm2', name: 'Leite', time: '09:30', icon: '🍼', acceptance: 'otimo', description: 'Mamadeira de 180ml' },
      { id: 'm3', name: 'Almoço', time: '11:00', icon: '🍲', acceptance: 'bom', description: 'Arroz, feijão, caldinho de carne e abobrinha' },
      { id: 'm4', name: 'Lanche da tarde', time: '13:00', icon: '🍎', acceptance: 'otimo', description: 'Banana amassadinha com farelo de aveia' },
      { id: 'm5', name: 'Leite', time: '14:30', icon: '🍼', acceptance: 'otimo', description: 'Mamadeira de 150ml' },
      { id: 'm6', name: 'Lanche final', time: '16:30', icon: '🍪', acceptance: 'bom', description: 'Biscoitinho de polvilho artesanal e água de coco' }
    ],
    diapers: {
      count: 4,
      logs: [
        { time: '08:30', type: 'Xixi', ointment: true },
        { time: '11:20', type: 'Xixi e Cocô', ointment: true },
        { time: '14:15', type: 'Xixi', ointment: true },
        { time: '16:30', type: 'Xixi', ointment: true }
      ]
    },
    sleep: [
      { period: 'Manhã', time: '09:45 às 10:45', quality: 'Tranquilo (dormiu bem)' },
      { period: 'Tarde', time: '14:45 às 16:00', quality: 'Descansou bastante' }
    ],
    medication: {
      hasMedication: false,
      details: 'Nenhuma medicação ministrada hoje.',
      temperature: '36.5 ºC (Normal)'
    },
    mood: {
      emoji: '😄',
      label: 'Alegre e participativo'
    },
    observations: {
      teacherNote: 'Dia muito alegre e tranquilo! Brincou bastante na piscina de bolinhas com os coleguinhas e explorou as texturas na aula de estimulação sensorial. Se alimentou super bem!',
      teacherName: 'Tia Carol e Tia Júlia'
    },
    updatedAt: new Date().toISOString()
  };
}

class StorageService {
  constructor() {
    this.init();
  }

  init() {
    // Inicializa crianças se não existirem
    if (!localStorage.getItem(STORAGE_KEYS.CHILDREN)) {
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(INITIAL_CHILDREN));
    }

    // Inicializa rotinas com um exemplo rico para hoje
    if (!localStorage.getItem(STORAGE_KEYS.ROUTINES)) {
      const todayStr = this.getTodayDateString();
      const initialRoutines = {};

      // Rotina do Theo com falta de fralda para demonstrar o alerta aos pais
      const theoRoutine = getDefaultRoutine('child_1', todayStr);
      theoRoutine.hygiene.fralda.ok = false;
      theoRoutine.hygiene.pomada.ok = false;
      theoRoutine.hygiene.faltaObservacao = 'Por favor, trazer novo pacote de fraldas tam M e pomada para assaduras.';
      theoRoutine.medication.hasMedication = true;
      theoRoutine.medication.details = 'Soro nasal aplicado às 10h e 14h conforme receita médica.';
      
      initialRoutines[`child_1_${todayStr}`] = theoRoutine;

      // Rotina da Helena
      const helenaRoutine = getDefaultRoutine('child_2', todayStr);
      helenaRoutine.observations.teacherNote = 'A Helena deu muitas gargalhadas na roda de historinha! Amou o livrinho dos animais da fazenda 🐮💛';
      initialRoutines[`child_2_${todayStr}`] = helenaRoutine;

      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(initialRoutines));
    }
  }

  getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getChildren() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHILDREN)) || INITIAL_CHILDREN;
    } catch {
      return INITIAL_CHILDREN;
    }
  }

  getChildById(id) {
    const list = this.getChildren();
    return list.find(c => c.id === id) || list[0];
  }

  getChildByParentEmail(email) {
    const list = this.getChildren();
    const found = list.find(c => c.parentEmail && c.parentEmail.toLowerCase() === email.toLowerCase());
    return found || list[0]; // fallback para a primeira criança se novo cadastro
  }

  addChild(child) {
    const list = this.getChildren();
    child.id = 'child_' + Date.now();
    list.push(child);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(list));
    return child;
  }

  getRoutine(childId, dateStr) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      if (allRoutines[key]) {
        return allRoutines[key];
      }
      // Se não existir rotina específica para a data, retorna padrão
      const defaultRot = getDefaultRoutine(childId, dateStr);
      return defaultRot;
    } catch {
      return getDefaultRoutine(childId, dateStr);
    }
  }

  saveRoutine(childId, dateStr, routineData) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      routineData.updatedAt = new Date().toISOString();
      allRoutines[key] = routineData;
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(allRoutines));
      return true;
    } catch (e) {
      console.error('Erro ao salvar rotina:', e);
      return false;
    }
  }
}

// Instância global
window.storageService = new StorageService();
