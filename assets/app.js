document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const fileNameDisplay = document.getElementById('file-name-display');
  const analyzeBtn = document.getElementById('analyze-btn');
  const loader = document.getElementById('loader');
  const resultsGrid = document.getElementById('results-grid');
  const dashboardContent = document.getElementById('dashboard-content');
  const exportOptions = document.getElementById('export-options');
  const resetBtn = document.getElementById('reset-btn');
  const emptyState = document.getElementById('empty-state');
  
  let selectedFile = null;
  let currentData = null;

  // Drag and drop logic
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (file.name.endsWith('.txt') || file.name.endsWith('.pdf')) {
      selectedFile = file;
      fileNameDisplay.textContent = `Selected: ${file.name}`;
      analyzeBtn.classList.remove('hidden');
    } else {
      alert("Please upload a .txt or .pdf file.");
      selectedFile = null;
      fileNameDisplay.textContent = "";
      analyzeBtn.classList.add('hidden');
    }
  }

  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Show loader
    uploadZone.classList.add('hidden');
    dashboardContent.classList.add('hidden');
    exportOptions.classList.add('hidden');
    loader.style.display = 'block';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to analyze");
      }

      currentData = await response.json();
      renderDashboard(currentData);
      showToast('Analysis complete! Dashboard generated successfully.');
    } catch (error) {
      alert(`Error: ${error.message}`);
      uploadZone.classList.remove('hidden');
    } finally {
      loader.style.display = 'none';
    }
  });

  resetBtn.addEventListener('click', () => {
    dashboardContent.classList.add('hidden');
    exportOptions.classList.add('hidden');
    uploadZone.classList.remove('hidden');
    selectedFile = null;
    fileNameDisplay.textContent = '';
    analyzeBtn.classList.add('hidden');
    currentData = null;
  });

  document.getElementById('export-json-btn').addEventListener('click', () => {
    if (!currentData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `client_report_${new Date().getTime()}.json`);
    dlAnchorElem.click();
  });

  document.getElementById('export-pdf-btn').addEventListener('click', () => {
    window.print();
  });

  function renderDashboard(data) {
    if (!data) return;

    dashboardContent.classList.remove('hidden');
    exportOptions.classList.remove('hidden');
    resultsGrid.style.display = 'grid';
    
    // Render Executive Summary
    renderExecutiveSummary(data.executive_summary);
    
    // Render Trend Summary
    renderTrendSummary(data.trend_summary);

    // Render Coach Insights
    renderCoachInsights(data.coach_insights);

    // Calculate and Render AI Quality Report dynamically
    const qualityReport = calculateAIQuality(data);
    renderAIQualityReport(qualityReport);

    // Render Grid Cards
    resultsGrid.innerHTML = '';
    let hasInsights = false;
    
    const titleMap = {
      weekly_summary: "Weekly Summary",
      nutrition_adherence: "Nutrition Adherence",
      exercise_steps: "Exercise / Steps",
      sleep: "Sleep",
      water_intake: "Water Intake",
      symptoms: "Symptoms",
      stress: "Stress",
      engagement_level: "Engagement Level",
      key_barriers: "Key Barriers",
      pending_actions: "Pending Actions",
      recommended_next_action: "Recommended Next Action"
    };

    for (const [key, title] of Object.entries(titleMap)) {
      if (data[key]) {
        resultsGrid.appendChild(createCard(title, data[key]));
        hasInsights = true;
      }
    }

    // Render Risk Flags specifically
    if (data.risk_flags) {
      resultsGrid.appendChild(createRiskCard(data.risk_flags));
      hasInsights = true;
    }

    if (!hasInsights) {
      resultsGrid.appendChild(emptyState);
      emptyState.classList.remove('hidden');
    }
  }

  function formatDay(dayStr) {
    if (!dayStr) return 'Unknown';
    const lower = dayStr.toLowerCase().trim();
    if (lower === 'all days' || lower === 'multiple days') return 'Multiple Days';
    const numMatch = dayStr.match(/\d+/);
    if (numMatch) return `Day ${numMatch[0]}`;
    return dayStr;
  }

  function calculateAIQuality(data) {
    let factsCount = 0;
    let clientReportedCount = 0;
    let inferenceCount = 0;
    let missingCount = 0;
    let totalFields = 0;
    let unsupportedClaimsCount = 0;
    let missingEvidenceCount = 0;

    const fieldsToCheck = [
      'executive_summary', 'trend_summary', 'coach_insights',
      'weekly_summary', 'nutrition_adherence', 'exercise_steps',
      'sleep', 'water_intake', 'symptoms', 'stress', 'engagement_level',
      'key_barriers', 'pending_actions', 'risk_flags', 'recommended_next_action'
    ];

    fieldsToCheck.forEach(key => {
      const field = data[key];
      if (field && field.classification) {
        totalFields++;
        if (field.classification === 'Missing Information') {
          missingCount++;
        } else if (field.classification === 'Confirmed Fact') {
          factsCount++;
          if (!field.evidence && !field.overall_health_status) missingEvidenceCount++; // Exempt summaries which don't have explicit single evidence sometimes, but they should if possible
        } else if (field.classification === 'Client Reported') {
          clientReportedCount++;
          if (!field.evidence) missingEvidenceCount++;
        } else if (field.classification === 'AI Inference') {
          inferenceCount++;
          if (!field.evidence_used || field.evidence_used.length === 0) unsupportedClaimsCount++;
        }
      }
    });

    const populatedFields = factsCount + clientReportedCount + inferenceCount;
    const evidenceCoverage = totalFields > 0 ? Math.round((populatedFields / totalFields) * 100) + '%' : '0%';
    
    let hallucinationRisk = 'Low';
    if (unsupportedClaimsCount > 0 || missingEvidenceCount > 2) {
      hallucinationRisk = 'High';
    } else if (missingEvidenceCount > 0) {
      hallucinationRisk = 'Medium';
    }

    return {
      evidence_coverage: evidenceCoverage,
      hallucination_risk: hallucinationRisk,
      facts_count: factsCount,
      client_reported_count: clientReportedCount,
      inference_count: inferenceCount,
      missing_information_count: missingCount,
      unsupported_claims_count: unsupportedClaimsCount
    };
  }

  function renderExecutiveSummary(summary) {
    const container = document.getElementById('executive-summary-section');
    if (!summary) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    
    container.innerHTML = `
      <div class="card-header">
        <h2 style="margin:0;">Executive Summary</h2>
        ${summary.classification ? `<span class="badge ${summary.classification.toLowerCase().replace(/ /g, '-')}">${summary.classification}</span>` : ''}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
        <div><strong>Status:</strong> ${summary.overall_health_status || 'Unknown'}</div>
        <div><strong>Overall Trend:</strong> ${getTrendWithArrow(summary.overall_trend)}</div>
        <div><strong>Risk Level:</strong> <span class="badge ${summary.risk_level?.toLowerCase()}">${summary.risk_level || 'Unknown'}</span></div>
        <div><strong>Engagement:</strong> ${summary.overall_engagement || 'Unknown'}</div>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Main Concerns:</strong>
        <ul>${(summary.main_concerns || []).map(c => `<li>${c}</li>`).join('') || '<li>None</li>'}</ul>
      </div>
      <div>
        <strong>Coach Focus This Week:</strong>
        <p>${summary.coach_focus_this_week || 'None'}</p>
      </div>
    `;
  }

  function getTrendWithArrow(trend) {
    if (trend === 'Improving') return 'Improving &uarr;';
    if (trend === 'Declining') return 'Declining &darr;';
    if (trend === 'Stable') return 'Stable &rarr;';
    if (trend === 'Mixed') return 'Mixed &harr;';
    return trend || 'Unknown';
  }

  function renderTrendSummary(trends) {
    const container = document.getElementById('trend-summary-section');
    if (!trends) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    
    container.innerHTML = `
      <div class="card-header">
        <h2 style="margin:0;">Trend Summary</h2>
        ${trends.classification ? `<span class="badge ${trends.classification.toLowerCase().replace(/ /g, '-')}">${trends.classification}</span>` : ''}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
        <div><strong>Sleep:</strong> ${getTrendWithArrow(trends.sleep)}</div>
        <div><strong>Nutrition:</strong> ${getTrendWithArrow(trends.nutrition)}</div>
        <div><strong>Stress:</strong> ${getTrendWithArrow(trends.stress)}</div>
        <div><strong>Activity:</strong> ${getTrendWithArrow(trends.activity)}</div>
      </div>
    `;
  }

  function renderCoachInsights(insights) {
    const container = document.getElementById('coach-insights-section');
    if (!insights) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="card-header">
        <h2 style="margin:0;">Coach Insights</h2>
        ${insights.classification ? `<span class="badge ${insights.classification.toLowerCase().replace(/ /g, '-')}">${insights.classification}</span>` : ''}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
        <div>
          <strong>Top 3 Observations</strong>
          <ul>${(insights.top_observations || []).map(o => `<li>${o}</li>`).join('') || '<li>None</li>'}</ul>
        </div>
        <div>
          <strong>Top 3 Risks</strong>
          <ul>${(insights.top_risks || []).map(r => `<li>${r}</li>`).join('') || '<li>None</li>'}</ul>
        </div>
        <div>
          <strong>Top 3 Wins</strong>
          <ul>${(insights.top_wins || []).map(w => `<li>${w}</li>`).join('') || '<li>None</li>'}</ul>
        </div>
      </div>
      <div style="margin-top: 1.5rem;">
        <strong>Immediate Next Action:</strong> ${insights.immediate_next_action || 'None'}
      </div>
      <div style="margin-top: 1rem;">
        <strong>Follow-up Questions:</strong>
        <ul>${(insights.follow_up_questions || []).map(q => `<li>${q}</li>`).join('') || '<li>None</li>'}</ul>
      </div>
    `;
  }

  function renderAIQualityReport(report) {
    const container = document.getElementById('ai-quality-report-section');
    if (!report) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    container.innerHTML = `
      <h2>AI Quality Report</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
        <div><strong>Evidence Coverage:</strong> ${report.evidence_coverage || 'Unknown'}</div>
        <div><strong>Hallucination Risk:</strong> ${report.hallucination_risk || 'Unknown'}</div>
        <div><strong>Confirmed Facts:</strong> ${report.facts_count || 0}</div>
        <div><strong>Client Reported:</strong> ${report.client_reported_count || 0}</div>
        <div><strong>AI Inferences:</strong> ${report.inference_count || 0}</div>
        <div><strong>Missing Information:</strong> ${report.missing_information_count || 0}</div>
        <div><strong>Unsupported Claims:</strong> ${report.unsupported_claims_count || 0}</div>
      </div>
    `;
  }

  function createCard(title, insight) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const classification = insight.classification || "Missing Information";
    const badgeClass = classification.toLowerCase().replace(/ /g, '-');
    const confPercentage = insight.confidence || 0;
    
    let rawValue = insight.value;
    if (Array.isArray(rawValue)) {
      rawValue = rawValue.length > 0 ? `<ul>${rawValue.map(v => `<li>${v}</li>`).join('')}</ul>` : "None";
    } else {
      rawValue = rawValue || "None";
    }

    let evHtml = '';
    if (insight.evidence && classification !== "Missing Information") {
      evHtml = `
        <div class="evidence-box">
          <p>"${insight.evidence}"</p>
          <small>- ${insight.speaker || 'Unknown'} (Day ${insight.day || 'Unknown'})</small>
        </div>
      `;
    }

    let explanationHtml = '';
    if (classification === "AI Inference") {
      explanationHtml = `
        <button class="explanation-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span>▼ Why was this inferred?</span>
        </button>
        <div class="explanation-panel hidden">
          <h4>Evidence Used</h4>
          <ul>
            ${(insight.evidence_used || []).map(e => `<li><small>Day ${insight.day || '?'}</small><br>"${e}"</li>`).join('') || '<li>None</li>'}
          </ul>
          <h4 style="margin-top:0.75rem;">Reasoning</h4>
          <p>${insight.reasoning || 'No reasoning provided.'}</p>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${title}</h3>
        <span class="badge ${badgeClass}">${classification}</span>
      </div>
      <div class="card-value">${rawValue}</div>
      ${evHtml}
      ${explanationHtml}
      <div class="meta-footer">
        <div class="confidence-container">
          <span class="confidence-label">Confidence</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${confPercentage}%;"></div>
          </div>
          <span class="confidence-value">${confPercentage}%</span>
        </div>
        <div class="actions">
          <button class="action-btn approve" title="Approve">
            <div class="icon">✔</div>
            <div class="action-label">Approve</div>
          </button>
          <button class="action-btn edit" title="Edit">
            <div class="icon">✏</div>
            <div class="action-label">Edit</div>
          </button>
          <button class="action-btn reject" title="Reject">
            <div class="icon">✖</div>
            <div class="action-label">Reject</div>
          </button>
        </div>
      </div>
      <div class="review-panel hidden">
        <input type="text" placeholder="Reviewed By..." class="review-by" style="margin-bottom:0.5rem;">
        <input type="text" placeholder="Comments/Reason for edit..." class="review-reason">
        <button class="btn save-review" style="margin-top: 0.5rem; padding: 0.4rem 0.8rem;">Save Review</button>
      </div>
    `;

    setupReviewActions(card);
    return card;
  }

  function createRiskCard(insight) {
    const title = "Risk / Attention Flags";
    const card = document.createElement('div');
    card.className = 'card';
    
    const classification = insight.classification || "Missing Information";
    const badgeClass = classification.toLowerCase().replace(/ /g, '-');
    const confPercentage = insight.confidence || 0;
    
    const risks = insight.value || {};
    let rawValue = '';
    if ((risks.critical && risks.critical.length) || (risks.high && risks.high.length) || (risks.medium && risks.medium.length) || (risks.low && risks.low.length)) {
      if (risks.critical && risks.critical.length) rawValue += `<div><span class="badge critical">Critical</span> <ul>${risks.critical.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
      if (risks.high && risks.high.length) rawValue += `<div style="margin-top:0.5rem;"><span class="badge high">High</span> <ul>${risks.high.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
      if (risks.medium && risks.medium.length) rawValue += `<div style="margin-top:0.5rem;"><span class="badge medium">Medium</span> <ul>${risks.medium.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
      if (risks.low && risks.low.length) rawValue += `<div style="margin-top:0.5rem;"><span class="badge low">Low</span> <ul>${risks.low.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
    } else {
      rawValue = "None";
    }

    let evHtml = '';
    if (insight.evidence && classification !== "Missing Information") {
      evHtml = `
        <div class="evidence-box">
          <p><strong>Evidence</strong><br><small>${formatDay(insight.day)}</small><br>"${insight.evidence}"</p>
        </div>
      `;
    }

    let explanationHtml = '';
    if (classification === "AI Inference") {
      explanationHtml = `
        <button class="explanation-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span>▼ Why?</span>
        </button>
        <div class="explanation-panel hidden">
          <h4>Evidence Used</h4>
          <ul>
            ${(insight.evidence_used || []).map(e => `<li><small>${formatDay(insight.day)}</small><br>"${e}"</li>`).join('') || '<li>None</li>'}
          </ul>
          <h4 style="margin-top:0.75rem;">Reasoning</h4>
          <p>${insight.reasoning || 'No reasoning provided.'}</p>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${title}</h3>
        <span class="badge ${badgeClass}">${classification}</span>
      </div>
      <div class="card-value">${rawValue}</div>
      ${evHtml}
      ${explanationHtml}
      <div class="meta-footer">
        <div class="confidence-container">
          <span class="confidence-label">Confidence</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${confPercentage}%;"></div>
          </div>
          <span class="confidence-value">${confPercentage}%</span>
        </div>
        <div class="actions">
          <button class="action-btn approve" title="Approve">
            <div class="icon">✔</div>
            <div class="action-label">Approve</div>
          </button>
          <button class="action-btn edit" title="Edit">
            <div class="icon">✏</div>
            <div class="action-label">Edit</div>
          </button>
          <button class="action-btn reject" title="Reject">
            <div class="icon">✖</div>
            <div class="action-label">Reject</div>
          </button>
        </div>
      </div>
      <div class="review-panel hidden">
        <input type="text" placeholder="Reviewed By..." class="review-by" style="margin-bottom:0.5rem;">
        <input type="text" placeholder="Comments/Reason for edit..." class="review-reason">
        <button class="btn save-review" style="margin-top: 0.5rem; padding: 0.4rem 0.8rem;">Save Review</button>
      </div>
    `;
    
    setupReviewActions(card);
    return card;
  }

  function setupReviewActions(card) {
    const approveBtn = card.querySelector('.approve');
    const editBtn = card.querySelector('.edit');
    const rejectBtn = card.querySelector('.reject');
    const reviewPanel = card.querySelector('.review-panel');
    const saveReview = card.querySelector('.save-review');

    approveBtn.onclick = () => {
      showToast('Approved successfully');
      card.style.borderColor = 'var(--success)';
      reviewPanel.classList.add('hidden');
    };

    editBtn.onclick = () => {
      reviewPanel.classList.toggle('hidden');
    };

    rejectBtn.onclick = () => {
      reviewPanel.classList.toggle('hidden');
      card.style.borderColor = 'var(--danger)';
    };

    saveReview.onclick = () => {
      showToast('Review saved. Timestamp: ' + new Date().toLocaleTimeString());
      reviewPanel.classList.add('hidden');
    };
  }

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
});
