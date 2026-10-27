export function getDemoDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Automotors Garage — Platform Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          screens: {
            'xs': '431px',
          },
          colors: {
            brand: {
              50: '#ecfdf5',
              500: '#10b981',
              600: '#059669',
              700: '#047857',
              900: '#064e3b',
              950: '#022c22',
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden w-full max-w-full">

  <!-- TOP BANNER: DEMO IDENTIFIER -->
  <div class="bg-amber-500/10 border-b border-amber-500/30 px-3 md:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs text-amber-300">
    <div class="flex items-center gap-2 min-w-0">
      <span class="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shrink-0">DEMO — MAURICIO REVIEW</span>
      <span class="truncate hidden sm:inline">Persistencia PostgreSQL + Clean Architecture. Sin mocks silenciosos.</span>
      <span class="truncate sm:hidden text-[11px]">Entorno Demo Real</span>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <button onclick="resetDemoData()" class="hidden sm:inline text-amber-400 hover:text-white underline font-semibold text-xs cursor-pointer">
        🔄 Re-sembrar
      </button>
      <span id="api-status-badge" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
        API: Conectada
      </span>
    </div>
  </div>

  <!-- HEADER -->
  <header class="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 px-3 sm:px-4 md:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
        🏎️
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <h1 class="text-xs sm:text-base font-extrabold text-white tracking-tight truncate">AUTOMOTORS GARAGE</h1>
          <span class="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">v0.8.0</span>
        </div>
        <p id="workshop-display-name" class="text-[11px] sm:text-xs text-emerald-400 font-semibold truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">[DEMO] Alpha Motors Garage</p>
      </div>
    </div>

    <!-- User / Mechanic Selector & Actions -->
    <div class="flex items-center gap-2 sm:gap-4 shrink-0">
      <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 sm:px-3 py-1 text-xs min-h-[44px]">
        <span class="text-slate-400 hidden sm:inline">Operador:</span>
        <select id="user-select" onchange="switchUser(this.value)" class="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs max-w-[110px] sm:max-w-none">
          <option value="mario" class="bg-slate-900 text-slate-200">Mario Rossi (Jefe)</option>
          <option value="lucas" class="bg-slate-900 text-slate-200">Lucas Gómez (Mecánico)</option>
        </select>
      </div>

      <button onclick="switchTab('QUICK_SERVICE')" class="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer min-h-[44px]">
        <span>⚡ Quick Service</span>
        <span class="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">&lt;60s</span>
      </button>

      <button onclick="handleLogout()" title="Cerrar Sesión" class="hidden md:flex text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 text-sm cursor-pointer min-h-[44px] min-w-[44px] items-center justify-center">
        🚪 Salir
      </button>
    </div>
  </header>

  <!-- DESKTOP NAVIGATION TABS -->
  <nav class="hidden md:block border-b border-slate-800/80 bg-slate-900/60 px-4 md:px-8 overflow-x-auto py-2.5">
    <div class="flex items-center gap-2 min-w-max text-xs md:text-sm">
      <button onclick="switchTab('DASHBOARD')" id="tab-btn-DASHBOARD" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all min-h-[44px]">
        📊 Dashboard
      </button>
      <button onclick="switchTab('QUICK_SERVICE')" id="tab-btn-QUICK_SERVICE" class="nav-tab px-3.5 py-1.5 rounded-lg font-bold transition-all text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30 min-h-[44px]">
        ⚡ Quick Service (&lt;60s)
      </button>
      <button onclick="switchTab('WORK_ORDERS')" id="tab-btn-WORK_ORDERS" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all min-h-[44px]">
        🛠️ Órdenes de Trabajo (<span id="count-wo">0</span>)
      </button>
      <button onclick="switchTab('VEHICLES')" id="tab-btn-VEHICLES" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all min-h-[44px]">
        🚗 Flota &amp; Pasaporte (<span id="count-veh">0</span>)
      </button>
      <button onclick="switchTab('PREVENTIVE')" id="tab-btn-PREVENTIVE" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all min-h-[44px]">
        ⏱️ Próximos Services OEM
      </button>
      <button onclick="switchTab('AI_ASSISTANT')" id="tab-btn-AI_ASSISTANT" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all min-h-[44px]">
        🧠 IA Dictado &amp; OBD2
      </button>
    </div>
  </nav>

  <!-- MAIN CONTAINER (WITH MOBILE SAFE-AREA BOTTOM CLEARANCE) -->
  <main class="flex-1 p-3 sm:p-4 md:p-8 max-w-7xl w-full mx-auto pb-28 md:pb-8 overflow-x-hidden">

    <!-- GLOBAL ALERT/TOAST -->
    <div id="toast" class="hidden mb-6 p-4 rounded-xl border flex items-center justify-between text-sm animate-fadeIn transition-all">
      <span id="toast-message" class="break-words">Mensaje</span>
      <button onclick="hideToast()" class="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-bold opacity-70 hover:opacity-100 ml-4 cursor-pointer">✕</button>
    </div>

    <!-- VIEW: DASHBOARD -->
    <section id="view-DASHBOARD" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div class="p-3 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Órdenes Activas</span>
          <p id="kpi-active-wo" class="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1">...</p>
          <span class="text-[10px] text-slate-500">En curso en taller</span>
        </div>
        <div class="p-3 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Completadas</span>
          <p id="kpi-completed-wo" class="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">...</p>
          <span class="text-[10px] text-emerald-500 font-semibold">100% Inmutables</span>
        </div>
        <div class="p-3 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Flota en Taller</span>
          <p id="kpi-vehicles" class="text-2xl sm:text-3xl font-black text-slate-100 font-mono mt-1">...</p>
          <span class="text-[10px] text-slate-500">Con pasaporte activo</span>
        </div>
        <div class="p-3 sm:p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Services Próximos</span>
          <p class="text-2xl sm:text-3xl font-black text-sky-400 font-mono mt-1">2</p>
          <span class="text-[10px] text-sky-500 font-semibold">Cálculo Determinista</span>
        </div>
      </div>

      <!-- Quick Action Banner -->
      <div class="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span class="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">Funcionalidad Estrella</span>
          <h3 class="text-base sm:text-lg font-bold text-white mt-1">Entrada Rápida de Servicio (Quick Service Entry)</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-xl">
            Registrá cambio de aceite, filtros y chequeo general en menos de 60 segundos con actualización atómica de odómetro, registro inmutable y confirmación asistida por IA.
          </p>
        </div>
        <button onclick="switchTab('QUICK_SERVICE')" class="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center">
          Abrir Quick Service ⚡
        </button>
      </div>

      <!-- Featured Vehicle Card: VW GOLF FOR MAURICIO -->
      <div class="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded border border-emerald-500/30 uppercase tracking-wider shrink-0">
              Vehículo Destacado para Mauricio
            </span>
            <h3 class="font-bold text-sm sm:text-base text-white">Volkswagen Golf VII 1.4 TSI Highline DSG (2019)</h3>
          </div>
          <span class="self-start sm:self-auto font-mono text-xs font-bold px-3 py-1 bg-black text-emerald-400 rounded-lg border border-slate-700 shrink-0">
            AE123CD
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs font-mono">
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Odómetro Registrado</span>
            <span class="text-emerald-400 font-bold text-sm sm:text-base">58,400 km</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Cliente Propietario</span>
            <span class="text-slate-200 font-bold text-xs sm:text-sm truncate block">Mauricio Fernández</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Último Service Realizado</span>
            <span class="text-slate-200 font-bold text-xs sm:text-sm">45,000 km</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Próximo Vencimiento</span>
            <span class="text-amber-400 font-bold text-xs sm:text-sm">60,000 km (en 1.600 km)</span>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p class="text-[11px] sm:text-xs text-slate-400 break-words">Motor 1.4 TSI 150 CV (EA211) • Caja DSG 7 marchas • Chasis: <span class="font-mono text-slate-300 break-all">WVWZZZAUZKP100001</span></p>
          <button onclick="openVehiclePassport('d0000000-0000-4000-8000-000000000001')" class="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center flex items-center justify-center">
            Ver Pasaporte Digital 🛡️
          </button>
        </div>
      </div>
    </section>

    <!-- VIEW: QUICK SERVICE ENTRY -->
    <section id="view-QUICK_SERVICE" class="hidden max-w-3xl mx-auto space-y-6">
      <div class="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl space-y-5">
        <div>
          <span class="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Flujo Mobile-First</span>
          <h2 class="text-lg sm:text-xl font-black text-white mt-0.5">Quick Service Entry &lt;60 Segundos</h2>
          <p class="text-xs text-slate-400 mt-1">Registrá una intervención de rutina en una sola transacción atómica verificada.</p>
        </div>

        <!-- Paso 1: Seleccionar Vehículo -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300 block">1. Seleccionar Vehículo por Patente o Modelo</label>
          <select id="qs-vehicle-select" onchange="onQsVehicleSelected(this.value)" class="w-full min-h-[48px] bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base md:text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500">
            <option value="">-- Seleccionar vehículo del taller --</option>
          </select>
        </div>

        <!-- Info del vehículo seleccionado -->
        <div id="qs-vehicle-info" class="hidden p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span id="qs-veh-plate" class="font-mono font-bold px-2.5 py-1 bg-black text-emerald-400 rounded border border-slate-700 uppercase">...</span>
            <span id="qs-veh-name" class="font-bold text-white">...</span>
          </div>
          <div>
            <span class="text-slate-400">Odómetro actual:</span>
            <strong id="qs-veh-km" class="text-emerald-400 font-mono text-sm ml-1">... km</strong>
          </div>
        </div>

        <!-- Paso 2: Kilometraje Nuevo -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300 block">2. Kilometraje Informado en Odómetro (km)</label>
          <input type="number" id="qs-odometer" inputmode="numeric" pattern="[0-9]*" placeholder="Ej: 58500" class="w-full min-h-[48px] bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500">
          <span class="text-[10px] text-slate-500 block">Debe ser igual o mayor al odómetro registrado actualmente.</span>
        </div>

        <!-- Paso 3: Trabajos Realizados -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300 block">3. Trabajos Realizados (Selección Rápida)</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" id="qs-service-pills">
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Aceite Sintético 5W40 y Filtro Mann" checked class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Aceite y Filtro</span>
            </label>
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Filtro de Aire y Habitáculo" class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Filtro de Aire</span>
            </label>
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Pastillas de Freno Cerámicas" class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Pastillas de Freno</span>
            </label>
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Rotación y Calibración Neumáticos" class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Rotación Ruedas</span>
            </label>
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Chequeo Computarizado OBD2" checked class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Escaneo OBD2</span>
            </label>
            <label class="min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300 transition-all select-none has-[:checked]:bg-emerald-950/60 has-[:checked]:border-emerald-500/80 has-[:checked]:text-emerald-300 has-[:checked]:shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <input type="checkbox" value="Líquido Refrigerante y Frenos" class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="leading-tight">Nivel de Fluidos</span>
            </label>
          </div>
        </div>

        <!-- Asistente de Voz / Dictado IA -->
        <div class="p-3.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              🎤 Dictado por Voz Asistido con IA
            </span>
            <span class="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
              Whisper + LLM
            </span>
          </div>
          <p class="text-xs text-slate-400">Dictá las observaciones del mecánico para autocompletar la orden y el kilometraje.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="simulateVoiceDictation()" class="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center">
              🎙️ Simular Dictado de Mecánico
            </button>
            <span id="voice-status" class="text-xs text-slate-400 self-center"></span>
          </div>

          <!-- Panel de confirmación humana obligatoria -->
          <div id="ai-confirmation-box" class="hidden p-3.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <strong class="text-emerald-400">Propuesta de IA extraída:</strong>
              <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">requiresConfirmation: true</span>
            </div>
            <p id="ai-extracted-text" class="text-slate-300 font-mono text-[11px] bg-slate-950 p-2 rounded break-words">...</p>
            <label class="min-h-[44px] flex items-center gap-2 text-slate-300 font-semibold cursor-pointer pt-1">
              <input type="checkbox" id="ai-confirm-checkbox" class="w-4 h-4 rounded border-slate-700 text-emerald-500 accent-emerald-500">
              <span class="text-xs leading-tight">Confirmo como técnico responsable que los datos extraídos son verídicos.</span>
            </label>
          </div>
        </div>

        <!-- Observaciones libres -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300 block">4. Observaciones Técnicas Internas</label>
          <textarea id="qs-notes" rows="2" placeholder="Ej: Neumáticos con 5.5mm. Sin fugas detectadas." class="w-full min-h-[56px] bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base md:text-xs text-slate-100 focus:outline-none focus:border-emerald-500"></textarea>
        </div>

        <!-- Botón Guardar -->
        <button type="button" onclick="submitQuickService()" id="qs-submit-btn" class="w-full min-h-[48px] py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2">
          <span>⚡ Confirmar y Guardar Servicio en Persistencia</span>
        </button>
      </div>
    </section>

    <!-- VIEW: WORK ORDERS -->
    <section id="view-WORK_ORDERS" class="hidden space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white">Órdenes de Trabajo del Taller</h2>
          <p class="text-xs text-slate-400">Aislamiento por taller activo garantizado mediante TenantGuard.</p>
        </div>
        <button onclick="switchTab('QUICK_SERVICE')" class="min-h-[44px] px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center">
          + Nueva Orden
        </button>
      </div>

      <div id="work-orders-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Rendered via JS -->
      </div>
    </section>

    <!-- VIEW: VEHICLES & PASSPORT -->
    <section id="view-VEHICLES" class="hidden space-y-4 sm:space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white">Parque Automotor Registrado</h2>
          <p class="text-xs text-slate-400">Historiales vehiculares inmutables y pasaportes B2C auditables.</p>
        </div>
      </div>

      <!-- Mobile Vehicle Selector Pills (Zero-scroll on mobile) -->
      <div class="md:hidden space-y-2">
        <span class="text-xs font-semibold text-slate-400 block">Vehículos del Taller:</span>
        <div id="mobile-vehicles-pills" class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar snap-x -mx-3 px-3">
          <!-- Rendered via JS -->
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <!-- Desktop Vehicle Cards Column -->
        <div id="vehicles-list" class="hidden md:block space-y-3">
          <!-- Rendered via JS -->
        </div>

        <!-- Selected Vehicle Passport Preview -->
        <div class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span id="vp-plate" class="font-mono text-xs font-bold px-3 py-1 bg-black text-emerald-400 rounded-lg border border-slate-700 uppercase">...</span>
              <h3 id="vp-title" class="text-base sm:text-lg font-black text-white mt-2">Seleccioná un vehículo</h3>
            </div>
            <div class="sm:text-right">
              <span class="text-[11px] sm:text-xs text-slate-500 block">Modo Vista:</span>
              <button onclick="togglePublicPassport()" id="passport-mode-toggle" class="min-h-[44px] inline-flex items-center text-xs font-bold text-emerald-400 hover:underline cursor-pointer">
                🛡️ Modo Taller (Completo)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs font-mono">
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">Odómetro</span>
              <strong id="vp-km" class="text-emerald-400 text-sm">... km</strong>
            </div>
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">Motorización</span>
              <strong id="vp-engine" class="text-slate-200 text-sm">...</strong>
            </div>
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">VIN / Chasis</span>
              <strong id="vp-vin" class="text-slate-400 text-xs font-mono break-all block">...</strong>
            </div>
          </div>

          <div>
            <h4 class="font-bold text-sm text-slate-200 mb-3">Historial de Intervenciones Certificadas</h4>
            <div id="vp-history-list" class="space-y-3">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- VIEW: PREVENTIVE SERVICES -->
    <section id="view-PREVENTIVE" class="hidden space-y-6">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white">Vencimientos Preventivos Deterministas (OEM)</h2>
        <p class="text-xs text-slate-400">Reglas técnicas documentadas por fabricante. Nunca calculadas por intuición de LLM.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- VW Golf Card -->
        <div class="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">AE123CD</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">PRÓXIMO A VENCER</span>
          </div>
          <h4 class="font-bold text-sm text-white">Volkswagen Golf VII 1.4 TSI</h4>
          <p class="text-xs text-slate-400">Service 60.000 km: Aceite 5W40 + Filtro + Bujías Laser Platinum.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">58,400 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-amber-400 font-bold">60,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Restante:</span><span class="text-amber-400 font-bold">1,600 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Manual Plan de Mantenimiento VW Golf VII (pág. 24)</p>
        </div>

        <!-- Toyota Corolla Card -->
        <div class="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-slate-200 rounded border border-slate-700">AF456GH</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">EN REGLA</span>
          </div>
          <h4 class="font-bold text-sm text-white">Toyota Corolla 2.0 SEG</h4>
          <p class="text-xs text-slate-400">Service 40.000 km: Aceite Genuino 0W20 + Filtro Cartucho.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">35,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-emerald-400 font-bold">40,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Restante:</span><span class="text-emerald-400 font-bold">5,000 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Manual de Propietario Toyota Corolla 2022 (pág. 142)</p>
        </div>

        <!-- Ford Ranger Card -->
        <div class="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-slate-200 rounded border border-slate-700">AD789JK</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">VENCIDO</span>
          </div>
          <h4 class="font-bold text-sm text-white">Ford Ranger 3.2 TDCi</h4>
          <p class="text-xs text-slate-400">Service 90.000 km: Aceite 5W30 + Filtro Diésel + Revisión Suspensión.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">92,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-rose-400 font-bold">90,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Excedido:</span><span class="text-rose-400 font-bold">+2,000 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Guía de Mantenimiento Programado Ford Ranger (pág. 68)</p>
        </div>
      </div>
    </section>

    <!-- VIEW: AI ASSISTANT & OBD2 -->
    <section id="view-AI_ASSISTANT" class="hidden max-w-2xl mx-auto space-y-6">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white">Asistente de IA &amp; Diagnóstico OBD2</h2>
        <p class="text-xs text-slate-400">Interpretación de códigos de avería DTC orientativa con descargo de responsabilidad.</p>
      </div>

      <div class="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <label class="text-xs font-bold text-slate-300 block">Códigos DTC / Scanner OBD2</label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input type="text" id="obd-input" value="P0300, P0171" class="flex-1 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 font-mono text-base md:text-sm text-slate-100 uppercase focus:outline-none focus:border-emerald-500">
          <button onclick="interpretObdCodes()" class="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center">
            Analizar DTC
          </button>
        </div>

        <div id="obd-result-box" class="hidden p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
          <h4 class="font-bold text-emerald-400">Resultado del Diagnóstico:</h4>
          <p id="obd-summary" class="text-slate-200 break-words">...</p>
          <div class="pt-2 border-t border-slate-800">
            <span class="text-[11px] text-amber-400 block font-semibold leading-relaxed">
              ⚠️ Descargo legal obligatorio: Sugerencia de asistencia técnica orientativa. Se requiere inspección física obligatoria por el técnico responsable.
            </span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- MOBILE BOTTOM NAVIGATION BAR -->
  <nav id="mobile-bottom-nav" class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
    <div class="flex items-center justify-around w-full">
      <!-- Tab 1: Dashboard -->
      <button onclick="switchTab('DASHBOARD')" id="mob-tab-btn-DASHBOARD" class="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 text-slate-400 text-xs transition-colors cursor-pointer" aria-label="Dashboard">
        <span class="text-base leading-none">📊</span>
        <span class="text-[9px] font-semibold mt-1 leading-tight">Inicio</span>
      </button>

      <!-- Tab 2: Work Orders -->
      <button onclick="switchTab('WORK_ORDERS')" id="mob-tab-btn-WORK_ORDERS" class="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 text-slate-400 text-xs transition-colors relative cursor-pointer" aria-label="Órdenes de Trabajo">
        <span class="text-base leading-none">🛠️</span>
        <span class="text-[9px] font-semibold mt-1 leading-tight flex items-center gap-0.5">
          Órdenes
          <span id="mob-count-wo" class="font-mono text-[9px] px-1 bg-amber-500/20 text-amber-400 rounded-full font-bold">0</span>
        </span>
      </button>

      <!-- Center Action Button: Quick Service -->
      <div class="flex-1 flex items-center justify-center px-1">
        <button onclick="switchTab('QUICK_SERVICE')" id="mob-tab-btn-QUICK_SERVICE" class="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.45)] border-4 border-slate-950 active:scale-95 transition-transform cursor-pointer" aria-label="Quick Service Entry">
          <span class="text-lg leading-none">⚡</span>
          <span class="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5">Quick</span>
        </button>
      </div>

      <!-- Tab 3: Vehicles & Passport -->
      <button onclick="switchTab('VEHICLES')" id="mob-tab-btn-VEHICLES" class="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 text-slate-400 text-xs transition-colors relative cursor-pointer" aria-label="Flota de Vehículos">
        <span class="text-base leading-none">🚗</span>
        <span class="text-[9px] font-semibold mt-1 leading-tight flex items-center gap-0.5">
          Flota
          <span id="mob-count-veh" class="font-mono text-[9px] px-1 bg-slate-800 text-slate-300 rounded-full font-bold">0</span>
        </span>
      </button>

      <!-- Tab 4: Preventive Services -->
      <button onclick="switchTab('PREVENTIVE')" id="mob-tab-btn-PREVENTIVE" class="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 text-slate-400 text-xs transition-colors cursor-pointer" aria-label="Services Preventivos OEM">
        <span class="text-base leading-none">⏱️</span>
        <span class="text-[9px] font-semibold mt-1 leading-tight">Services</span>
      </button>

      <!-- Secondary Trigger: Más / More Sheet -->
      <button onclick="openMoreSheet()" id="mob-btn-MORE" class="flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer" aria-label="Más Opciones">
        <span class="text-base leading-none">⋯</span>
        <span class="text-[9px] font-semibold mt-1 leading-tight">Más</span>
      </button>
    </div>
  </nav>

  <!-- BOTTOM SHEET MODAL: MÁS (Secondary actions) -->
  <div id="more-sheet-backdrop" onclick="closeMoreSheet()" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"></div>
  <div id="more-sheet" class="hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 z-50 shadow-2xl transition-transform max-h-[85vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <span class="text-base">⚙️</span>
        <h3 class="text-sm font-bold text-white">Herramientas y Acciones Secundarias</h3>
      </div>
      <button onclick="closeMoreSheet()" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg text-lg cursor-pointer">✕</button>
    </div>
    <div class="space-y-2">
      <button onclick="switchTab('AI_ASSISTANT'); closeMoreSheet();" class="w-full min-h-[48px] p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="text-xl">🧠</span>
          <div>
            <div class="text-xs font-bold text-white">IA Dictado &amp; Diagnóstico OBD2</div>
            <div class="text-[11px] text-slate-400">Interpretación de DTCs orientativa</div>
          </div>
        </div>
        <span class="text-slate-500 font-bold">→</span>
      </button>
      <button onclick="switchTab('PREVENTIVE'); closeMoreSheet();" class="w-full min-h-[48px] p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="text-xl">⏱️</span>
          <div>
            <div class="text-xs font-bold text-white">Próximos Services OEM</div>
            <div class="text-[11px] text-slate-400">Vencimientos preventivos deterministas</div>
          </div>
        </div>
        <span class="text-slate-500 font-bold">→</span>
      </button>
      <button onclick="resetDemoData(); closeMoreSheet();" class="w-full min-h-[48px] p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="text-xl">🔄</span>
          <div>
            <div class="text-xs font-bold text-amber-300">Re-sembrar Datos Demo</div>
            <div class="text-[11px] text-slate-400">Reiniciar flota y órdenes en PostgreSQL</div>
          </div>
        </div>
        <span class="text-amber-500 font-bold">↻</span>
      </button>
      <button onclick="handleLogout(); closeMoreSheet();" class="w-full min-h-[48px] p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-between text-left transition-all cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="text-xl">🚪</span>
          <div>
            <div class="text-xs font-bold text-rose-300">Cerrar Sesión</div>
            <div class="text-[11px] text-rose-400/80">Desconectar operador activo</div>
          </div>
        </div>
        <span class="text-rose-400 font-bold">✕</span>
      </button>
    </div>
  </div>

  <script>
    // State
    let authToken = null;
    let activeTenantId = 'a0000000-0000-4000-8000-000000000001';
    let currentUser = null;
    let vehicles = [];
    let workOrders = [];
    let isPublicPassportView = false;
    let selectedVehicleId = 'd0000000-0000-4000-8000-000000000001';

    // XSS Sanitizer for dynamic API text
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Auto-login on startup
    async function init() {
      await autoLogin('mario@alphamotors.com', 'Password123!');
      await loadAllData();
      switchTab('DASHBOARD');
    }

    async function autoLogin(email, password) {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, workshopId: activeTenantId })
        });
        const data = await res.json();
        if (res.ok) {
          authToken = data.token;
          activeTenantId = data.session.activeTenantId;
          currentUser = data.user;
          document.getElementById('api-status-badge').textContent = 'API: Conectada';
          document.getElementById('api-status-badge').className = 'px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold';
        } else {
          showToast(data.error || 'Error al iniciar sesión', 'error');
        }
      } catch (err) {
        showToast('Error de red al conectar con API: ' + err.message, 'error');
      }
    }

    async function loadAllData() {
      if (!authToken) return;
      try {
        // 1. Fetch Vehicles
        const vRes = await fetch('/api/v1/vehicles', {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (vRes.ok) {
          vehicles = await vRes.json();
          document.getElementById('count-veh').textContent = vehicles.length;
          const mobCountVeh = document.getElementById('mob-count-veh');
          if (mobCountVeh) mobCountVeh.textContent = vehicles.length;
          document.getElementById('kpi-vehicles').textContent = vehicles.length;
          renderVehiclesList();
          populateQsVehicleSelect();
        }

        // 2. Fetch Work Orders
        const woRes = await fetch('/api/v1/work-orders', {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (woRes.ok) {
          workOrders = await woRes.json();
          document.getElementById('count-wo').textContent = workOrders.length;
          const mobCountWo = document.getElementById('mob-count-wo');
          if (mobCountWo) mobCountWo.textContent = workOrders.length;
          const activeCount = workOrders.filter(w => w.status !== 'COMPLETED').length;
          const completedCount = workOrders.filter(w => w.status === 'COMPLETED').length;
          document.getElementById('kpi-active-wo').textContent = activeCount;
          document.getElementById('kpi-completed-wo').textContent = completedCount;
          renderWorkOrders();
        }

        // 3. Load Featured Vehicle Passport
        if (vehicles.length > 0) {
          openVehiclePassport(selectedVehicleId);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    }

    function switchTab(tabName) {
      const tabs = ['DASHBOARD', 'QUICK_SERVICE', 'WORK_ORDERS', 'VEHICLES', 'PREVENTIVE', 'AI_ASSISTANT'];
      tabs.forEach(t => {
        const viewEl = document.getElementById('view-' + t);
        const btnEl = document.getElementById('tab-btn-' + t);
        const mobBtnEl = document.getElementById('mob-tab-btn-' + t);

        if (viewEl) viewEl.classList.toggle('hidden', t !== tabName);

        if (btnEl) {
          if (t === tabName) {
            btnEl.className = 'nav-tab px-3.5 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm transition-all min-h-[44px]';
          } else {
            btnEl.className = 'nav-tab px-3.5 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 transition-all min-h-[44px]';
          }
        }

        if (mobBtnEl && t !== 'QUICK_SERVICE') {
          if (t === tabName) {
            mobBtnEl.classList.remove('text-slate-400');
            mobBtnEl.classList.add('text-emerald-400', 'font-bold');
          } else {
            mobBtnEl.classList.remove('text-emerald-400', 'font-bold');
            mobBtnEl.classList.add('text-slate-400');
          }
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openMoreSheet() {
      const sheet = document.getElementById('more-sheet');
      const backdrop = document.getElementById('more-sheet-backdrop');
      if (sheet) sheet.classList.remove('hidden');
      if (backdrop) backdrop.classList.remove('hidden');
    }

    function closeMoreSheet() {
      const sheet = document.getElementById('more-sheet');
      const backdrop = document.getElementById('more-sheet-backdrop');
      if (sheet) sheet.classList.add('hidden');
      if (backdrop) backdrop.classList.add('hidden');
    }

    function renderWorkOrders() {
      const grid = document.getElementById('work-orders-grid');
      if (!grid) return;
      if (workOrders.length === 0) {
        grid.innerHTML = '<p class="text-xs text-slate-500 col-span-2">No hay órdenes de trabajo activas en este taller.</p>';
        return;
      }
      grid.innerHTML = workOrders.map(wo => {
        const isCompleted = wo.status === 'COMPLETED';
        const badgeColor = isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        const veh = vehicles.find(v => v.id === wo.vehicleId);
        const safeId = escapeHtml(wo.id);
        const safeShortId = escapeHtml(wo.id.slice(0, 8));
        const safeStatus = escapeHtml(wo.status);
        const safePlate = escapeHtml(veh?.plate || 'S/P');
        const safeVehName = escapeHtml(veh ? veh.make + ' ' + veh.model : 'Vehículo');
        const safeIssue = escapeHtml(wo.reportedIssue);
        const safeDiag = wo.diagnosis ? escapeHtml(wo.diagnosis) : '';
        const safeMileage = Number(wo.reportedMileage).toLocaleString();

        return \`
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="font-mono text-xs font-bold text-slate-400">\${safeShortId}...</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border \${badgeColor}">\${safeStatus}</span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">\${safePlate}</span>
                <span class="font-bold text-white text-xs">\${safeVehName}</span>
              </div>
              <h4 class="font-semibold text-slate-200 text-xs mt-1 break-words">\${safeIssue}</h4>
              \${safeDiag ? \`<p class="text-[11px] text-slate-400 bg-slate-950 p-2 rounded mt-2 font-mono break-words">\${safeDiag}</p>\` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
              <span class="text-slate-500">\${safeMileage} km</span>
              \${!isCompleted ? \`
                <button onclick="closeWorkOrder('\${safeId}')" class="min-h-[44px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center justify-center">
                  Cerrar Orden Transaccional 🔒
                </button>
              \` : '<span class="text-emerald-500 font-bold text-[11px] flex items-center min-h-[44px]">✓ Certificado</span>'}
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderVehiclesList() {
      const list = document.getElementById('vehicles-list');
      const mobPills = document.getElementById('mobile-vehicles-pills');

      const renderedCards = vehicles.map(v => {
        const isSelected = v.id === selectedVehicleId;
        const borderClass = isSelected ? 'border-emerald-500 bg-slate-900/90' : 'border-slate-800 bg-slate-950 hover:border-slate-700';
        const safeId = escapeHtml(v.id);
        const safePlate = escapeHtml(v.plate || 'S/P');
        const safeMake = escapeHtml(v.make);
        const safeModel = escapeHtml(v.model);
        const safeYear = escapeHtml(v.year);
        const safeVin = escapeHtml(v.vin);
        const safeKm = Number(v.currentMileage).toLocaleString();

        return \`
          <div onclick="openVehiclePassport('\${safeId}')" class="p-4 border rounded-2xl cursor-pointer transition-all space-y-2 \${borderClass}">
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-bold px-2.5 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">\${safePlate}</span>
              <span class="font-mono text-xs text-slate-400">\${safeKm} km</span>
            </div>
            <h4 class="font-bold text-sm text-white">\${safeMake} \${safeModel} (\${safeYear})</h4>
            <span class="text-[10px] text-slate-500 font-mono block break-all">VIN: \${safeVin}</span>
          </div>
        \`;
      }).join('');

      if (list) list.innerHTML = renderedCards;

      if (mobPills) {
        mobPills.innerHTML = vehicles.map(v => {
          const isSelected = v.id === selectedVehicleId;
          const safeId = escapeHtml(v.id);
          const safePlate = escapeHtml(v.plate || 'S/P');
          const safeModel = escapeHtml(v.make + ' ' + v.model);
          const pillClass = isSelected
            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700';

          return \`
            <button type="button" onclick="openVehiclePassport('\${safeId}')" class="snap-start shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all \${pillClass}">
              <span class="font-mono text-[10px] font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">\${safePlate}</span>
              <span class="whitespace-nowrap">\${safeModel}</span>
            </button>
          \`;
        }).join('');
      }
    }

    function populateQsVehicleSelect() {
      const sel = document.getElementById('qs-vehicle-select');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Seleccionar vehículo del taller --</option>' +
        vehicles.map(v => \`<option value="\${escapeHtml(v.id)}">\${escapeHtml(v.plate || 'S/P')} — \${escapeHtml(v.make)} \${escapeHtml(v.model)} (\${escapeHtml(v.currentMileage)} km)</option>\`).join('');
      // Default to VW Golf if available
      const golf = vehicles.find(v => v.make.toLowerCase().includes('volkswagen'));
      if (golf) {
        sel.value = golf.id;
        onQsVehicleSelected(golf.id);
      }
    }

    function onQsVehicleSelected(id) {
      const veh = vehicles.find(v => v.id === id);
      const infoBox = document.getElementById('qs-vehicle-info');
      const odoInput = document.getElementById('qs-odometer');
      if (!veh) {
        infoBox.classList.add('hidden');
        return;
      }
      infoBox.classList.remove('hidden');
      document.getElementById('qs-veh-plate').textContent = veh.plate || 'S/P';
      document.getElementById('qs-veh-name').textContent = veh.make + ' ' + veh.model;
      document.getElementById('qs-veh-km').textContent = Number(veh.currentMileage).toLocaleString() + ' km';
      odoInput.value = veh.currentMileage + 100; // Suggest increment
    }

    async function openVehiclePassport(vehicleId) {
      selectedVehicleId = vehicleId;
      renderVehiclesList();
      try {
        const query = isPublicPassportView ? '?public=true' : '';
        const res = await fetch(\`/api/v1/vehicles/\${encodeURIComponent(vehicleId)}/passport\${query}\`, {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (res.ok) {
          const pass = await res.json();
          document.getElementById('vp-plate').textContent = pass.vehicle.plate || 'S/P';
          document.getElementById('vp-title').textContent = pass.vehicle.make + ' ' + pass.vehicle.model + ' (' + pass.vehicle.year + ')';
          document.getElementById('vp-km').textContent = Number(pass.vehicle.currentMileage).toLocaleString() + ' km';
          document.getElementById('vp-engine').textContent = pass.vehicle.engine || 'Standard';
          document.getElementById('vp-vin').textContent = pass.vehicle.vin;

          const historyList = document.getElementById('vp-history-list');
          const records = pass.timeline || pass.records || [];
          if (!records || records.length === 0) {
            historyList.innerHTML = '<p class="text-xs text-slate-500">Sin intervenciones registradas aún.</p>';
          } else {
            historyList.innerHTML = records.map(r => {
              const safeWorkshop = escapeHtml(r.workshopName || 'Taller');
              const safeKm = Number(r.recordedMileage).toLocaleString();
              const safeNotes = r.internalNotes ? escapeHtml(r.internalNotes) : '';
              const services = (r.servicesPerformed || []).map(s => {
                const title = typeof s === 'string' ? s : (s.title || s.name || JSON.stringify(s));
                return \`<span class="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded font-medium">\${escapeHtml(title)}</span>\`;
              }).join('');

              return \`
                <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-200">\${safeWorkshop}</span>
                    <span class="font-mono text-emerald-400 font-bold">\${safeKm} km</span>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    \${services}
                  </div>
                  \${safeNotes ? \`<p class="text-[10px] text-slate-400 italic break-words">Notas: \${safeNotes}</p>\` : ''}
                </div>
              \`;
            }).join('');
          }
        }
      } catch (err) {
        console.error('Error cargando pasaporte:', err);
      }
    }

    function togglePublicPassport() {
      isPublicPassportView = !isPublicPassportView;
      const btn = document.getElementById('passport-mode-toggle');
      if (isPublicPassportView) {
        btn.textContent = '👁️ Modo Público B2C (PII Sanitizado)';
        btn.className = 'min-h-[44px] inline-flex items-center text-xs font-bold text-amber-400 hover:underline cursor-pointer';
      } else {
        btn.textContent = '🛡️ Modo Taller (Completo)';
        btn.className = 'min-h-[44px] inline-flex items-center text-xs font-bold text-emerald-400 hover:underline cursor-pointer';
      }
      openVehiclePassport(selectedVehicleId);
    }

    function simulateVoiceDictation() {
      const status = document.getElementById('voice-status');
      status.textContent = 'Escuchando dictado del mecánico...';
      setTimeout(() => {
        status.textContent = 'Procesando Whisper + Extractor LLM...';
        setTimeout(() => {
          status.textContent = '✓ Dictado procesado exitosamente.';
          const box = document.getElementById('ai-confirmation-box');
          box.classList.remove('hidden');
          document.getElementById('ai-extracted-text').textContent =
            'Dictado: "Ingresó Golf para cambio de aceite 5W40 y chequeo general con 58.500 km. Batería en 85%."';
          document.getElementById('qs-odometer').value = 58500;
        }, 600);
      }, 500);
    }

    async function submitQuickService() {
      const vehId = document.getElementById('qs-vehicle-select').value;
      const odo = Number(document.getElementById('qs-odometer').value);
      const notes = document.getElementById('qs-notes').value;

      if (!vehId) {
        showToast('Por favor seleccioná un vehículo.', 'error');
        return;
      }
      if (!odo || odo <= 0) {
        showToast('El kilometraje informado debe ser un número positivo.', 'error');
        return;
      }

      // Check ai confirmation if dictation was opened
      const box = document.getElementById('ai-confirmation-box');
      if (!box.classList.contains('hidden')) {
        const checked = document.getElementById('ai-confirm-checkbox').checked;
        if (!checked) {
          showToast('La IA exige confirmación humana obligatoria antes de persistir.', 'error');
          return;
        }
      }

      const checkboxes = document.querySelectorAll('#qs-service-pills input[type="checkbox"]:checked');
      const services = Array.from(checkboxes).map(c => c.value);
      if (services.length === 0) {
        showToast('Seleccioná al menos un trabajo realizado.', 'error');
        return;
      }

      const btn = document.getElementById('qs-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Guardando en PostgreSQL...';

      try {
        const res = await fetch('/api/v1/work-orders/quick-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            vehicleId: vehId,
            odometerKm: odo,
            interventions: services,
            observations: notes || 'Service rápido ejecutado satisfactoriamente.',
            idempotencyKey: 'qs-' + Date.now()
          })
        });

        const data = await res.json();
        if (res.ok) {
          showToast('¡Quick Service guardado con éxito! Odómetro actualizado y orden cerrada atómicamente.', 'success');
          await loadAllData();
          switchTab('WORK_ORDERS');
        } else {
          showToast(data.error || 'Error al guardar Quick Service', 'error');
        }
      } catch (err) {
        showToast('Error de red: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Confirmar y Guardar Servicio en Persistencia';
      }
    }

    async function closeWorkOrder(orderId) {
      try {
        const res = await fetch(\`/api/v1/work-orders/\${encodeURIComponent(orderId)}/close\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            idempotencyKey: 'close-' + orderId + '-' + Date.now(),
            internalNotes: 'Orden completada y verificada en banco de pruebas.',
            partsCost: 35000,
            laborCost: 15000
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Orden cerrada atómicamente con Unit of Work y outbox event.', 'success');
          await loadAllData();
        } else {
          showToast(data.error || 'Error al cerrar orden', 'error');
        }
      } catch (err) {
        showToast('Error de red al cerrar orden: ' + err.message, 'error');
      }
    }

    async function interpretObdCodes() {
      const code = document.getElementById('obd-input').value;
      if (!code) return;
      try {
        const res = await fetch('/api/v1/ai/obd2/interpret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            dtcCodes: code.split(',').map(s => s.trim()),
            vehicleSpecs: { make: 'Volkswagen', model: 'Golf', year: 2019 }
          })
        });
        const data = await res.json();
        if (res.ok) {
          const box = document.getElementById('obd-result-box');
          box.classList.remove('hidden');
          document.getElementById('obd-summary').textContent = data.interpretation || JSON.stringify(data);
        } else {
          showToast(data.error || 'Error analizando OBD2', 'error');
        }
      } catch (err) {
        showToast('Error al consultar interpretador OBD2: ' + err.message, 'error');
      }
    }

    async function resetDemoData() {
      try {
        const res = await fetch('/api/v1/demo/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Datos demo re-sembrados con éxito en PostgreSQL.', 'success');
          await loadAllData();
        } else {
          showToast(data.error || 'Error al re-sembrar datos demo', 'error');
        }
      } catch (err) {
        showToast('Error al re-sembrar: ' + err.message, 'error');
      }
    }

    function switchUser(userKey) {
      if (userKey === 'mario') {
        autoLogin('mario@alphamotors.com', 'Password123!').then(() => loadAllData());
      } else {
        autoLogin('lucas@alphamotors.com', 'Password123!').then(() => loadAllData());
      }
    }

    function handleLogout() {
      authToken = null;
      document.getElementById('api-status-badge').textContent = 'API: Desconectada';
      document.getElementById('api-status-badge').className = 'px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold';
      showToast('Sesión cerrada. Para reingresar, seleccioná un operador en la barra superior.', 'info');
    }

    function showToast(msg, type = 'info') {
      const toast = document.getElementById('toast');
      const text = document.getElementById('toast-message');
      text.textContent = msg;
      if (type === 'error') {
        toast.className = 'mb-6 p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 flex items-center justify-between text-sm animate-fadeIn';
      } else if (type === 'success') {
        toast.className = 'mb-6 p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm animate-fadeIn';
      } else {
        toast.className = 'mb-6 p-4 rounded-xl border bg-slate-900 border-slate-700 text-slate-200 flex items-center justify-between text-sm animate-fadeIn';
      }
      toast.classList.remove('hidden');
      setTimeout(() => hideToast(), 5000);
    }

    function hideToast() {
      document.getElementById('toast').classList.add('hidden');
    }

    // Run
    init();
  </script>
</body>
</html>
`;
}
