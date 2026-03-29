// Sprint app — localStorage + Firestore sync
;(function(){

  // ── Firebase setup ──────────────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyDi60Z2_SZhai5fWGzMi1I_qzvF9m9R4RY",
    authDomain: "goaltracker-1542a.firebaseapp.com",
    projectId: "goaltracker-1542a",
    storageBucket: "goaltracker-1542a.firebasestorage.app",
    messagingSenderId: "897924085621",
    appId: "1:897924085621:web:b889cf2333ecaf6ce8853c"
  }
  firebase.initializeApp(firebaseConfig)
  const db = firebase.firestore()

  function getUserId(){
    let id = localStorage.getItem('sprintUserId')
    if(!id){
      id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
      localStorage.setItem('sprintUserId', id)
    }
    return id
  }

  const userDoc = db.collection('users').doc(getUserId())

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const tbody = document.getElementById('sprint-body')
  const thead = document.getElementById('sprint-head')
  const startInput = document.getElementById('start-date')
  const endInput = document.getElementById('end-date')
  const startWeightInput = document.getElementById('start-weight')
  const targetWeightInput = document.getElementById('target-weight')
  const waterLimitInput = document.getElementById('water-limit')
  const settingsToggle = document.getElementById('settings-toggle')
  const settingsPanel = document.getElementById('settings-panel')
  const toggleBtn = document.getElementById('toggle-show')
  const goalInput = document.getElementById('goal-input')
  const goalAddBtn = document.getElementById('goal-add')
  const goalTagsEl = document.getElementById('goal-tags')
  const remainingEl = document.getElementById('remaining-count')
  const completedEl = document.getElementById('completed-count')
  const missedEl = document.getElementById('missed-count')

  // ── State ───────────────────────────────────────────────────────────────────
  let settings = loadSettingsLocal()
  let data = loadDataLocal()
  let showAll = false

  // ── Init inputs ─────────────────────────────────────────────────────────────
  function applySettingsToInputs(){
    startInput.value = settings.startDate
    endInput.value = settings.endDate
    startWeightInput.value = settings.startWeight || ''
    targetWeightInput.value = settings.targetWeight || ''
    waterLimitInput.value = settings.waterLimit || 2
    if(!settings.goals) settings.goals = []
    renderGoalTags()
  }
  applySettingsToInputs()

  // ── Settings listeners ──────────────────────────────────────────────────────
  ;[startInput,endInput,startWeightInput,targetWeightInput,waterLimitInput].forEach(inp=>{
    inp.addEventListener('change', ()=>{
      settings.startDate = startInput.value
      settings.endDate = endInput.value
      settings.startWeight = startWeightInput.value
      settings.targetWeight = targetWeightInput.value
      settings.waterLimit = parseFloat(waterLimitInput.value) || 2
      saveSettings()
      render()
    })
  })

  // ── Goal management ─────────────────────────────────────────────────────────
  function renderGoalTags(){
    goalTagsEl.innerHTML = ''
    ;(settings.goals || []).forEach(goal=>{
      const tag = document.createElement('span')
      tag.className = 'goal-tag'
      tag.innerHTML = `${goal.name} <button class="goal-remove" data-id="${goal.id}">×</button>`
      tag.querySelector('.goal-remove').addEventListener('click', ()=>{
        settings.goals = settings.goals.filter(g => g.id !== goal.id)
        saveSettings()
        renderGoalTags()
        render()
      })
      goalTagsEl.appendChild(tag)
    })
  }

  function addGoal(){
    const name = goalInput.value.trim()
    if(!name) return
    if(!settings.goals) settings.goals = []
    const id = 'goal_' + Date.now().toString(36)
    settings.goals.push({id, name})
    saveSettings()
    renderGoalTags()
    render()
    goalInput.value = ''
  }

  goalAddBtn.addEventListener('click', addGoal)
  goalInput.addEventListener('keydown', e => { if(e.key === 'Enter') addGoal() })

  renderGoalTags()

  settingsToggle.addEventListener('click', ()=>{
    settingsPanel.classList.toggle('collapsed')
    settingsToggle.textContent = settingsPanel.classList.contains('collapsed') ? 'Settings' : 'Hide'
  })

  toggleBtn.addEventListener('click', ()=>{
    showAll = !showAll
    toggleBtn.textContent = showAll ? 'Show first 7 days' : 'Show all days'
    render()
  })

  // ── Local storage ───────────────────────────────────────────────────────────
  function loadSettingsLocal(){
    const raw = localStorage.getItem('sprintSettings')
    if(raw) return JSON.parse(raw)
    const today = new Date()
    const end = new Date(today)
    end.setDate(today.getDate()+14)
    return {
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
      startWeight: '',
      targetWeight: '',
      waterLimit: 2,
      goals: []
    }
  }

  function loadDataLocal(){
    const raw = localStorage.getItem('sprintData')
    return raw ? JSON.parse(raw) : {}
  }

  function saveSettingsLocal(){
    localStorage.setItem('sprintSettings', JSON.stringify(settings))
  }

  function saveDataLocal(){
    localStorage.setItem('sprintData', JSON.stringify(data))
  }

  // ── Firestore ───────────────────────────────────────────────────────────────
  let firestoreTimer = null

  function scheduleFirestoreSave(){
    clearTimeout(firestoreTimer)
    firestoreTimer = setTimeout(()=>{
      userDoc.set({ settings, data }).catch(e => console.warn('Firestore save failed', e))
    }, 600)
  }

  async function syncFromFirestore(){
    try {
      const snap = await userDoc.get()
      if(snap.exists){
        const remote = snap.data()
        if(remote.settings){ settings = remote.settings; saveSettingsLocal(); applySettingsToInputs() }
        if(remote.data){ data = remote.data; saveDataLocal() }
        render()
      }
    } catch(e){
      console.warn('Firestore load failed, using local data', e)
    }
  }

  // ── Unified save ────────────────────────────────────────────────────────────
  function saveSettings(){
    saveSettingsLocal()
    scheduleFirestoreSave()
  }

  function saveData(){
    saveDataLocal()
    scheduleFirestoreSave()
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatDateInput(d){
    const dd = new Date(d)
    const y = dd.getFullYear()
    const m = String(dd.getMonth()+1).padStart(2,'0')
    const day = String(dd.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  function parseDate(s){ return new Date(s + 'T00:00:00') }

  function daysBetween(a,b){
    const _a = new Date(a.getFullYear(),a.getMonth(),a.getDate())
    const _b = new Date(b.getFullYear(),b.getMonth(),b.getDate())
    return Math.round((_b - _a)/(1000*60*60*24))
  }

  function buildDays(){
    const start = parseDate(settings.startDate)
    const end = parseDate(settings.endDate)
    const len = daysBetween(start,end) + 1
    const arr = []
    for(let i=0;i<len;i++){
      const d = new Date(start)
      d.setDate(start.getDate()+i)
      arr.push({index:i+1, date:d})
    }
    return arr
  }

  function getEffectiveWeight(days, upToIndex){
    for(let i = upToIndex - 1; i >= 0; i--){
      const id = `${settings.startDate}_${days[i].index}`
      const w = (data[id] || {}).weight
      if(w) return w
    }
    return settings.startWeight ? parseFloat(settings.startWeight) : ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  function renderHeader(){
    // Remove any previously added custom goal headers
    thead.querySelectorAll('.col-goal').forEach(el => el.remove())
    // Insert before weight column
    const weightTh = thead.querySelector('.col-weight')
    ;(settings.goals || []).forEach(goal=>{
      const th = document.createElement('th')
      th.className = 'col-goal'
      th.textContent = goal.name
      thead.insertBefore(th, weightTh)
    })
  }

  function render(){
    renderHeader()
    tbody.innerHTML = ''
    const days = buildDays()
    const today = new Date()

    days.forEach((dayObj, idx)=>{
      const dayIndex = dayObj.index
      const id = `${settings.startDate}_${dayIndex}`
      const row = document.createElement('tr')
      if(!showAll && dayIndex>7) row.classList.add('hidden-row')

      const dateStr = dayObj.date.toLocaleDateString(undefined,{month:'short', day:'numeric'})
      const entry = data[id] || {}
      const displayWeight = entry.weight || getEffectiveWeight(days, idx)

      const movementState = entry.movement === 'missed' ? 2 : (entry.movement === true ? 1 : 0)
      const waterState = entry.water === 'missed' ? 2 : (entry.water === true ? 1 : 0)

      const goalCells = (settings.goals || []).map(goal=>{
        const s = entry[goal.id] === 'missed' ? 2 : (entry[goal.id] === true ? 1 : 0)
        return `<td><button class="tri-btn custom-goal ${s===1?'done':s===2?'missed':''}" data-key="${goal.id}" data-state="${s}" aria-label="${goal.name}">${s===1?'✔':s===2?'✖':''}</button></td>`
      }).join('')

      row.innerHTML = `
        <td>${String(dayIndex).padStart(2,'0')}</td>
        <td>${dateStr}</td>
        <td><button class="tri-btn movement ${movementState===1?'done':movementState===2?'missed':''}" data-key="movement" data-state="${movementState}" aria-label="movement status">${movementState===1?'✔':movementState===2?'✖':''}</button></td>
        <td><button class="tri-btn water ${waterState===1?'done':waterState===2?'missed':''}" data-key="water" data-state="${waterState}" aria-label="water status">${waterState===1?'✔':waterState===2?'✖':''}</button></td>
        ${goalCells}
        <td><span class="weight-display">${displayWeight ? (displayWeight + ' lbs') : '--'}</span></td>
        <td><input class="note" data-key="note" value="${entry.note||''}" placeholder="Notes" /></td>
      `

      const isFuture = daysBetween(today, dayObj.date) > 0
      if(daysBetween(dayObj.date, today) === 0) row.classList.add('today')
      if(isFuture){
        row.classList.add('future-row')
        row.querySelectorAll('button,input').forEach(el => el.disabled = true)
        tbody.appendChild(row)
        return
      }

      row.querySelectorAll('.tri-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const key = btn.dataset.key
          let state = parseInt(btn.dataset.state,10) || 0
          state = (state + 1) % 3
          btn.dataset.state = state
          btn.classList.remove('done','missed')
          if(state === 1){ btn.classList.add('done'); btn.textContent = '✔' }
          else if(state === 2){ btn.classList.add('missed'); btn.textContent = '✖' }
          else { btn.textContent = '' }

          if(!data[id]) data[id] = {}
          if(state === 1) data[id][key] = true
          else if(state === 2) data[id][key] = 'missed'
          else delete data[id][key]
          saveData()
          updateSummary()
        })
      })

      row.querySelectorAll('input').forEach(inp=>{
        inp.addEventListener('change', ()=>{
          const key = inp.dataset.key
          if(!data[id]) data[id] = {}
          if(key === 'weight') data[id][key] = inp.value ? parseFloat(inp.value) : ''
          else data[id][key] = inp.value
          saveData()
          updateSummary()
        })
      })

      const weightDisplay = row.querySelector('.weight-display')
      if(weightDisplay){
        weightDisplay.addEventListener('click', function handleClick(e){
          const span = e.currentTarget
          const input = document.createElement('input')
          input.type = 'number'
          input.step = '0.1'
          input.className = 'weight'
          input.placeholder = 'lbs'
          const originalValue = entry.weight || displayWeight || ''
          input.value = originalValue
          span.replaceWith(input)
          input.focus()
          input.select()
          input.addEventListener('blur', ()=>{
            const newVal = input.value ? parseFloat(input.value) : null
            const oldVal = entry.weight || null
            if(newVal !== oldVal){
              if(!data[id]) data[id] = {}
              if(newVal) data[id].weight = newVal
              else delete data[id].weight
              saveData()
              updateSummary()
            }
            const newSpan = document.createElement('span')
            newSpan.className = 'weight-display'
            const effective = (data[id] && data[id].weight) || getEffectiveWeight(days, idx)
            newSpan.textContent = effective ? (effective + ' lbs') : '--'
            input.replaceWith(newSpan)
            newSpan.addEventListener('click', handleClick)
          })
        })
      }

      tbody.appendChild(row)
    })

    updateSummary()
  }

  function updateSummary(){
    const days = buildDays()
    const today = new Date()
    let completed = 0, missed = 0, remaining = 0
    days.forEach(d=>{
      const id = `${settings.startDate}_${d.index}`
      const entry = data[id] || {}
      const isPast = daysBetween(d.date, today) < 0
      const isFutureOrToday = daysBetween(today, d.date) >= 0
      const doneMovement = entry.movement === true
      const doneWater = entry.water === true
      const missedMovement = entry.movement === 'missed'
      const missedWater = entry.water === 'missed'

      if(doneMovement && doneWater) completed++
      else if(missedMovement || missedWater) missed++
      else if(isPast && !(doneMovement && doneWater)) missed++
      else if(isFutureOrToday) remaining++
    })

    remainingEl.textContent = remaining
    completedEl.textContent = completed
    missedEl.textContent = missed
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  render()
  syncFromFirestore()

})()
