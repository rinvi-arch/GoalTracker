// Sprint app with settings, 7-day preview + expand, and persistence
(function(){
  const tbody = document.getElementById('sprint-body')
  const startInput = document.getElementById('start-date')
  const endInput = document.getElementById('end-date')
  const startWeightInput = document.getElementById('start-weight')
  const targetWeightInput = document.getElementById('target-weight')
  const waterLimitInput = document.getElementById('water-limit')
  const settingsToggle = document.getElementById('settings-toggle')
  const settingsPanel = document.getElementById('settings-panel')
  const toggleBtn = document.getElementById('toggle-show')
  const remainingEl = document.getElementById('remaining-count')
  const completedEl = document.getElementById('completed-count')
  const missedEl = document.getElementById('missed-count')

  let settings = loadSettings()
  let data = loadData()
  let showAll = false

  // initialize inputs
  startInput.value = settings.startDate
  endInput.value = settings.endDate
  startWeightInput.value = settings.startWeight || ''
  targetWeightInput.value = settings.targetWeight || ''
  waterLimitInput.value = settings.waterLimit || 2

  // live-apply settings on change
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

  // settings toggle
  settingsToggle.addEventListener('click', ()=>{
    settingsPanel.classList.toggle('collapsed')
    settingsToggle.textContent = settingsPanel.classList.contains('collapsed') ? 'Settings' : 'Hide'
  })

  toggleBtn.addEventListener('click', ()=>{
    showAll = !showAll
    toggleBtn.textContent = showAll ? 'Show first 7 days' : 'Show all days'
    render()
  })

  function loadSettings(){
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
      waterLimit: 2
    }
  }

  function saveSettings(){
    localStorage.setItem('sprintSettings', JSON.stringify(settings))
  }

  function loadData(){
    const raw = localStorage.getItem('sprintData')
    return raw ? JSON.parse(raw) : {}
  }

  function saveData(){
    localStorage.setItem('sprintData', JSON.stringify(data))
  }

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
    return Math.round(( _b - _a )/(1000*60*60*24))
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

  function render(){
    tbody.innerHTML = ''
    const days = buildDays()
    const total = days.length
    const today = new Date()

    days.forEach((dayObj, idx)=>{
      const dayIndex = dayObj.index
      const id = `${settings.startDate}_${dayIndex}`
      const row = document.createElement('tr')
      if(!showAll && dayIndex>7) row.classList.add('hidden-row')

      const dateStr = dayObj.date.toLocaleDateString(undefined,{month:'short', day:'numeric'})
      const isWeightAllowed = (dayIndex % 7 === 0) || dayIndex === total
      const entry = data[id] || {}

      // determine tri-state for movement and water
      const movementState = entry.movement === 'missed' ? 2 : (entry.movement === true ? 1 : 0)
      const waterState = entry.water === 'missed' ? 2 : (entry.water === true ? 1 : 0)

      row.innerHTML = `
        <td>${String(dayIndex).padStart(2,'0')}</td>
        <td>${dateStr}</td>
        <td><button class="tri-btn movement ${movementState===1? 'done': movementState===2? 'missed':''}" data-key="movement" data-state="${movementState}" aria-label="movement status">${movementState===1? '✔': movementState===2? '✖': ''}</button></td>
        <td><button class="tri-btn water ${waterState===1? 'done': waterState===2? 'missed':''}" data-key="water" data-state="${waterState}" aria-label="water status">${waterState===1? '✔': waterState===2? '✖': ''}</button></td>
        <td>${isWeightAllowed ? `<input class="weight" data-key="weight" type="number" step="0.1" value="${entry.weight||''}" placeholder="lbs" />` : `<span class="weight-display">${entry.weight ? (entry.weight + ' lbs') : '--'}</span>`}</td>
        <td><input class=note data-key="note" value="${entry.note||''}" placeholder="Notes" /></td>
      `

      // apply 'today' highlight
      const today = new Date()
      if(daysBetween(dayObj.date, today) === 0){ row.classList.add('today') }

      // attach listeners to tri-state buttons
      row.querySelectorAll('.tri-btn').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          const key = btn.dataset.key
          let state = parseInt(btn.dataset.state,10) || 0
          // cycle 0 -> 1 -> 2 -> 0
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

      // attach listeners to other inputs (weight and notes)
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

      // make non-week weight display editable on click
      const weightDisplay = row.querySelector('.weight-display')
      if(weightDisplay){
        weightDisplay.addEventListener('click', function handleClick(){
          const span = weightDisplay
          const input = document.createElement('input')
          input.type = 'number'
          input.step = '0.1'
          input.className = 'weight'
          input.placeholder = 'lbs'
          input.value = entry.weight || ''
          input.dataset.key = 'weight'
          span.replaceWith(input)
          input.focus()
          input.addEventListener('change', ()=>{
            if(!data[id]) data[id] = {}
            data[id].weight = input.value ? parseFloat(input.value) : ''
            saveData()
            updateSummary()
            // replace back with display showing value
            const newSpan = document.createElement('span')
            newSpan.className = 'weight-display'
            newSpan.textContent = data[id].weight ? (data[id].weight + ' lbs') : '--'
            input.replaceWith(newSpan)
            // reattach click handler
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
      const date = d.date
      const isPast = daysBetween(date,today) < 0
      const isFutureOrToday = daysBetween(today,date) >= 0
      const doneMovement = entry.movement === true
      const doneWater = entry.water === true
      const missedMovement = entry.movement === 'missed'
      const missedWater = entry.water === 'missed'

      if(doneMovement && doneWater) {
        completed++
      } else if(missedMovement || missedWater) {
        missed++
      } else if(isPast && !(doneMovement && doneWater)) {
        // past day with no completed goals
        missed++
      } else if(isFutureOrToday) {
        remaining++
      }
    })

    remainingEl.textContent = remaining
    completedEl.textContent = completed
    missedEl.textContent = missed
  }

  // initial render
  render()

})();
