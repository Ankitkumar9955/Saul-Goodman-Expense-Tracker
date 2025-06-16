// Define global variables for managing application state and UI elements
let transactions = []; // Array to store all transaction objects
let darkMode = false; // State for dark mode toggle
let currentEditingTransactionId = null; // Stores the ID of the transaction being edited

// Predefined categories for transactions
const categories = [
    "Food", "Transport", "Shopping", "Bills", "Entertainment",
    "Salary", "Freelance", "Investment", "Health", "Education",
    "Utilities", "Rent", "Groceries", "Dining Out", "Travel",
    "Personal Care", "Gifts", "Savings", "Miscellaneous"
];

// Chart instances
let expenseCategoryChartInstance;
let reportsCategoryChartInstance;
let reportsMonthlyChartInstance;

// --- DOM Element References ---
const darkModeToggle = document.getElementById('dark-mode-toggle');
const lightIcon = darkModeToggle.querySelector('.light-icon');
const darkIcon = darkModeToggle.querySelector('.dark-icon');

// Navigation buttons
const navDashboardBtn = document.getElementById('nav-dashboard');
const navHistoryBtn = document.getElementById('nav-history');
const navReportsBtn = document.getElementById('nav-reports');
const navButtons = document.querySelectorAll('.nav-button');

// Views
const dashboardView = document.getElementById('dashboard-view');
const historyView = document.getElementById('history-view');
const reportsView = document.getElementById('reports-view');
const views = document.querySelectorAll('.view');

// Dashboard elements
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const totalBalanceEl = document.getElementById('total-balance');
const incomeLastUpdatedEl = document.getElementById('income-last-updated');
const expensesLastUpdatedEl = document.getElementById('expenses-last-updated');
const addTransactionButton = document.getElementById('add-transaction-button');
const recentTransactionsList = document.getElementById('recent-transactions-list');
const noRecentTransactionsEl = document.getElementById('no-recent-transactions');

// Transaction Modal elements
const transactionModal = document.getElementById('transaction-modal');
const modalTitle = document.getElementById('modal-title');
const transactionForm = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const transactionTitleInput = document.getElementById('transaction-title');
const transactionAmountInput = document.getElementById('transaction-amount');
const transactionTypeSelect = document.getElementById('transaction-type');
const transactionCategorySelect = document.getElementById('transaction-category');
const transactionDateInput = document.getElementById('transaction-date');
const transactionRecurringCheckbox = document.getElementById('transaction-recurring');
const cancelTransactionButton = document.getElementById('cancel-transaction');

// History View elements
const historySearchInput = document.getElementById('history-search');
const historyCategoryFilter = document.getElementById('history-category-filter');
const historyDateFilter = document.getElementById('history-date-filter');
const customDateRangeDiv = document.getElementById('custom-date-range');
const customStartDateInput = document.getElementById('custom-start-date');
const customEndDateInput = document.getElementById('custom-end-date');
const transactionHistoryTableBody = document.getElementById('transaction-history-table-body');
const noHistoryTransactionsEl = document.getElementById('no-history-transactions');

// Reports View elements
const exportCsvButton = document.getElementById('export-csv-button');

// Alert Modal elements
const alertModal = document.getElementById('alert-modal');
const alertIcon = document.getElementById('alert-icon');
const alertMessage = document.getElementById('alert-message');
const alertOkButton = document.getElementById('alert-ok-button');
const alertCancelButton = document.getElementById('alert-cancel-button');

// --- Utility Functions ---

/**
 * Formats a number as currency (Indian Rupees).
 * @param {number} amount - The amount to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

/**
 * Formats a date string into a readable format (e.g., "Jan 01, 2023").
 * @param {string} dateString - The date string to format (YYYY-MM-DD).
 * @returns {string} The formatted date string.
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Shows a custom alert/confirmation modal.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', 'warning', 'confirm'. Determines icon and button visibility.
 * @returns {Promise<boolean>} Resolves true if 'OK' is clicked, false if 'Cancel' (for 'confirm' type).
 */
function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        alertMessage.textContent = message;
        alertIcon.className = ''; // Clear previous icons
        alertCancelButton.classList.add('hidden'); // Hide cancel by default

        switch (type) {
            case 'success':
                alertIcon.classList.add('fas', 'fa-check-circle', 'text-emerald-500');
                alertOkButton.textContent = 'OK';
                alertOkButton.classList.remove('bg-rose-500');
                alertOkButton.classList.add('bg-emerald-500');
                break;
            case 'error':
                alertIcon.classList.add('fas', 'fa-times-circle', 'text-rose-500');
                alertOkButton.textContent = 'OK';
                alertOkButton.classList.remove('bg-emerald-500');
                alertOkButton.classList.add('bg-rose-500');
                break;
            case 'warning':
                alertIcon.classList.add('fas', 'fa-exclamation-triangle', 'text-amber-500');
                alertOkButton.textContent = 'OK';
                alertOkButton.classList.remove('bg-rose-500');
                alertOkButton.classList.add('bg-emerald-500');
                break;
            case 'confirm':
                alertIcon.classList.add('fas', 'fa-question-circle', 'text-sky-500');
                alertOkButton.textContent = 'Confirm';
                alertOkButton.classList.remove('bg-rose-500');
                alertOkButton.classList.add('bg-emerald-500');
                alertCancelButton.classList.remove('hidden');
                break;
            default: // info
                alertIcon.classList.add('fas', 'fa-info-circle', 'text-blue-500');
                alertOkButton.textContent = 'OK';
                alertOkButton.classList.remove('bg-rose-500');
                alertOkButton.classList.add('bg-emerald-500');
                break;
        }

        alertModal.classList.remove('hidden');
        setTimeout(() => alertModal.classList.add('opacity-100'), 10); // Smooth fade in

        const handleOk = () => {
            alertModal.classList.remove('opacity-100');
            alertModal.classList.add('hidden');
            alertOkButton.removeEventListener('click', handleOk);
            alertCancelButton.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            alertModal.classList.remove('opacity-100');
            alertModal.classList.add('hidden');
            alertOkButton.removeEventListener('click', handleOk);
            alertCancelButton.removeEventListener('click', handleCancel);
            resolve(false);
        };

        alertOkButton.addEventListener('click', handleOk);
        alertCancelButton.addEventListener('click', handleCancel);
    });
}


// --- Data Persistence (LocalStorage) ---

/**
 * Saves the current transactions array to local storage.
 */
function saveTransactions() {
    try {
        localStorage.setItem('expenseTrackerTransactions', JSON.stringify(transactions));
    } catch (e) {
        console.error("Error saving to local storage:", e);
        showAlert("Failed to save data. Your browser may be in private mode or storage is full.", 'error');
    }
}

/**
 * Loads transactions from local storage.
 * @returns {Array} The loaded transactions array, or an empty array if none found.
 */
function loadTransactions() {
    try {
        const storedTransactions = localStorage.getItem('expenseTrackerTransactions');
        return storedTransactions ? JSON.parse(storedTransactions) : [];
    } catch (e) {
        console.error("Error loading from local storage:", e);
        showAlert("Failed to load saved data. Data might be corrupted.", 'error');
        return []; // Return empty array to prevent app crash
    }
}

// --- UI Rendering Functions ---

/**
 * Renders the summary section (Total Income, Expenses, Balance) on the Dashboard.
 */
function renderDashboardSummary() {
    let totalIncome = 0;
    let totalExpenses = 0;
    let lastIncomeDate = 'N/A';
    let lastExpenseDate = 'N/A';

    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
            if (lastIncomeDate === 'N/A' || new Date(t.date) > new Date(lastIncomeDate)) {
                lastIncomeDate = t.date;
            }
        } else { // expense
            totalExpenses += t.amount;
            if (lastExpenseDate === 'N/A' || new Date(t.date) > new Date(lastExpenseDate)) {
                lastExpenseDate = t.date;
            }
        }
    });

    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpensesEl.textContent = formatCurrency(totalExpenses);
    totalBalanceEl.textContent = formatCurrency(totalIncome - totalExpenses);
    incomeLastUpdatedEl.textContent = lastIncomeDate !== 'N/A' ? formatDate(lastIncomeDate) : 'N/A';
    expensesLastUpdatedEl.textContent = lastExpenseDate !== 'N/A' ? formatDate(lastExpenseDate) : 'N/A';
}

/**
 * Renders the list of recent transactions on the Dashboard.
 */
function renderRecentTransactions() {
    // Sort by date descending and take the top 5
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    recentTransactionsList.innerHTML = ''; // Clear previous entries

    if (recent.length === 0) {
        noRecentTransactionsEl.classList.remove('hidden');
        recentTransactionsList.classList.add('hidden');
        return;
    } else {
        noRecentTransactionsEl.classList.add('hidden');
        recentTransactionsList.classList.remove('hidden');
    }

    recent.forEach(t => {
        const typeColor = t.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
        const sign = t.type === 'income' ? '+' : '-';
        const icon = t.type === 'income' ? 'fa-arrow-circle-up' : 'fa-arrow-circle-down';

        const transactionDiv = document.createElement('div');
        transactionDiv.className = `flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-700 shadow-sm border-l-4 ${t.type === 'income' ? 'border-emerald-500' : 'border-rose-500'}`;
        transactionDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icon} ${typeColor} text-xl mr-3"></i>
                <div>
                    <p class="font-medium text-slate-800 dark:text-zinc-100">${t.title}</p>
                    <p class="text-sm text-slate-500 dark:text-zinc-400">${t.category} &bull; ${formatDate(t.date)}</p>
                </div>
            </div>
            <p class="font-semibold ${typeColor}">${sign}${formatCurrency(t.amount)}</p>
        `;
        recentTransactionsList.appendChild(transactionDiv);
    });
}

/**
 * Renders the full transaction history table.
 * @param {Array} transactionsToRender - The array of transactions to display in the table.
 */
function renderTransactionTable(transactionsToRender = transactions) {
    transactionHistoryTableBody.innerHTML = ''; // Clear existing rows

    if (transactionsToRender.length === 0) {
        noHistoryTransactionsEl.classList.remove('hidden');
        return;
    } else {
        noHistoryTransactionsEl.classList.add('hidden');
    }

    transactionsToRender.forEach(t => {
        const row = transactionHistoryTableBody.insertRow();
        row.className = 'hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors duration-150';
        row.innerHTML = `
            <td class="py-3 px-6 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-zinc-50">${t.title}</td>
            <td class="py-3 px-6 whitespace-nowrap text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'} font-semibold">${formatCurrency(t.amount)}</td>
            <td class="py-3 px-6 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300 capitalize">${t.type}</td>
            <td class="py-3 px-6 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">${t.category}</td>
            <td class="py-3 px-6 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">${formatDate(t.date)}</td>
            <td class="py-3 px-6 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                <i class="fas ${t.recurring ? 'fa-check-circle text-emerald-500' : 'fa-times-circle text-rose-500'}"></i>
            </td>
            <td class="py-3 px-6 whitespace-nowrap text-center text-sm font-medium">
                <button data-id="${t.id}" class="edit-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 mr-4 transition-colors duration-150">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button data-id="${t.id}" class="delete-btn text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 transition-colors duration-150">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </td>
        `;
    });
}

/**
 * Initializes or updates the Chart.js charts.
 */
function updateCharts() {
    // Data for charts
    const expenseData = transactions.filter(t => t.type === 'expense');
    const categoryExpenses = expenseData.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});

    const monthlyExpenses = expenseData.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + t.amount;
        return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyExpenses).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const dateA = new Date(`1 ${monthA} ${yearA}`);
        const dateB = new Date(`1 ${monthB} ${yearB}`);
        return dateA - dateB;
    });

    const categoryLabels = Object.keys(categoryExpenses);
    const categoryValues = Object.values(categoryExpenses);
    const monthlyLabels = sortedMonths;
    const monthlyValues = sortedMonths.map(month => monthlyExpenses[month]);

    const chartColors = [
        '#10B981', '#EF4444', '#0EA5E9', '#EAB308', '#6366F1',
        '#EC4899', '#84CC16', '#F97316', '#14B8A6', '#A855F7',
        '#FACC15', '#6B7280', '#D946EF', '#22D3EE', '#FB7185'
    ];
    const borderColors = chartColors.map(color => {
        const rgba = Chart.helpers.color(color).alpha(0.8).rgbString();
        return rgba;
    });


    // Expense Category Pie Chart (Dashboard)
    const expenseCategoryCtx = document.getElementById('expenseCategoryChart').getContext('2d');
    if (expenseCategoryChartInstance) {
        expenseCategoryChartInstance.destroy(); // Destroy existing chart instance
    }
    expenseCategoryChartInstance = new Chart(expenseCategoryCtx, {
        type: 'pie',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryValues,
                backgroundColor: chartColors.slice(0, categoryLabels.length),
                borderColor: borderColors.slice(0, categoryLabels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: darkMode ? '#d4d4d8' : '#333' // Zinc-300 / Slate-800
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });

    // Reports: Expense Category Pie Chart
    const reportsCategoryCtx = document.getElementById('reportsCategoryChart').getContext('2d');
    if (reportsCategoryChartInstance) {
        reportsCategoryChartInstance.destroy();
    }
    reportsCategoryChartInstance = new Chart(reportsCategoryCtx, {
        type: 'pie',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryValues,
                backgroundColor: chartColors.slice(0, categoryLabels.length),
                borderColor: borderColors.slice(0, categoryLabels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: darkMode ? '#d4d4d8' : '#333'
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });

    // Reports: Monthly Spending Bar Chart
    const reportsMonthlyCtx = document.getElementById('reportsMonthlyChart').getContext('2d');
    if (reportsMonthlyChartInstance) {
        reportsMonthlyChartInstance.destroy();
    }
    reportsMonthlyChartInstance = new Chart(reportsMonthlyCtx, {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Monthly Expenses',
                data: monthlyValues,
                backgroundColor: chartColors[2] || '#0EA5E9', // Sky-500
                borderColor: borderColors[2] || '#0EA5E9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: darkMode ? '#d4d4d8' : '#333'
                    }
                },
                x: {
                    ticks: {
                        color: darkMode ? '#d4d4d8' : '#333'
                    }
                }
            }
        }
    });
}


// --- Modal Control Functions ---

/**
 * Displays the transaction modal.
 * @param {object} [transactionData=null] - Optional transaction data for editing.
 */
function showModal(transactionData = null) {
    transactionForm.reset(); // Clear form fields
    currentEditingTransactionId = null; // Reset editing state

    if (transactionData) {
        // Populate form for editing
        modalTitle.textContent = 'Edit Transaction';
        transactionIdInput.value = transactionData.id;
        transactionTitleInput.value = transactionData.title;
        transactionAmountInput.value = transactionData.amount;
        transactionTypeSelect.value = transactionData.type;
        transactionCategorySelect.value = transactionData.category;
        transactionDateInput.value = transactionData.date; // YYYY-MM-DD
        transactionRecurringCheckbox.checked = transactionData.recurring || false;
        currentEditingTransactionId = transactionData.id;
    } else {
        // Set default values for new transaction
        modalTitle.textContent = 'Add New Transaction';
        transactionDateInput.value = new Date().toISOString().split('T')[0]; // Set today's date
    }

    transactionModal.classList.remove('hidden');
    setTimeout(() => {
        transactionModal.classList.add('opacity-100');
        transactionModal.querySelector('div').classList.remove('scale-95');
        transactionModal.querySelector('div').classList.add('scale-100');
    }, 10);
}

/**
 * Hides the transaction modal.
 */
function hideModal() {
    transactionModal.classList.remove('opacity-100');
    transactionModal.querySelector('div').classList.remove('scale-100');
    transactionModal.querySelector('div').classList.add('scale-95');
    setTimeout(() => transactionModal.classList.add('hidden'), 300); // Allow transition to complete
}

// --- Transaction Management ---

/**
 * Adds a new transaction to the array.
 * @param {object} transaction - The transaction object to add.
 */
function addTransaction(transaction) {
    transactions.push({ id: Date.now().toString(), ...transaction }); // Use timestamp as unique ID
    saveTransactions();
    renderAllUI();
}

/**
 * Updates an existing transaction.
 * @param {string} id - The ID of the transaction to update.
 * @param {object} newData - The new data for the transaction.
 */
function updateTransaction(id, newData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...newData };
        saveTransactions();
        renderAllUI();
    }
}

/**
 * Deletes a transaction by its ID.
 * @param {string} id - The ID of the transaction to delete.
 */
async function deleteTransaction(id) {
    const confirmed = await showAlert('Are you sure you want to delete this transaction?', 'confirm');
    if (confirmed) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        renderAllUI();
        showAlert('Transaction deleted successfully!', 'success');
    }
}

// --- Filtering and Search Logic ---

/**
 * Filters transactions based on current search, category, and date range inputs.
 * @returns {Array} The filtered array of transactions.
 */
function filterTransactions() {
    let filtered = [...transactions];

    // Search by title or amount
    const searchTerm = historySearchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            t.amount.toString().includes(searchTerm)
        );
    }

    // Filter by category
    const selectedCategory = historyCategoryFilter.value;
    if (selectedCategory) {
        filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by date range
    const dateFilter = historyDateFilter.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    if (dateFilter !== 'all') {
        filtered = filtered.filter(t => {
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0); // Normalize transaction date

            if (dateFilter === 'today') {
                return transactionDate.getTime() === today.getTime();
            } else if (dateFilter === 'this_week') {
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start of week
                return transactionDate >= firstDayOfWeek && transactionDate <= today;
            } else if (dateFilter === 'this_month') {
                return transactionDate.getMonth() === today.getMonth() &&
                       transactionDate.getFullYear() === today.getFullYear();
            } else if (dateFilter === 'custom') {
                const startDate = customStartDateInput.value ? new Date(customStartDateInput.value) : null;
                const endDate = customEndDateInput.value ? new Date(customEndDateInput.value) : null;

                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999); // End of day for end date

                return (!startDate || transactionDate >= startDate) &&
                       (!endDate || transactionDate <= endDate);
            }
            return true;
        });
    }

    // Sort by date descending for display
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// --- Dark/Light Mode Toggle ---

/**
 * Toggles the dark mode on/off.
 */
function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.documentElement.classList.add('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    }
    localStorage.setItem('expenseTrackerDarkMode', darkMode);
    // Re-render charts to update colors based on new theme
    updateCharts();
}

/**
 * Initializes the dark mode based on local storage or system preference.
 */
function initializeDarkMode() {
    const storedMode = localStorage.getItem('expenseTrackerDarkMode');
    if (storedMode !== null) {
        darkMode = JSON.parse(storedMode);
    } else {
        // Check system preference if no stored preference
        darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (darkMode) {
        document.documentElement.classList.add('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    }
}

// --- CSV Export ---

/**
 * Exports the current transaction history to a CSV file.
 */
function exportToCSV() {
    if (transactions.length === 0) {
        showAlert('No transactions to export.', 'warning');
        return;
    }

    const headers = ['ID', 'Title', 'Amount', 'Type', 'Category', 'Date', 'Recurring'];
    const rows = transactions.map(t => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`, // Escape double quotes
        t.amount,
        t.type,
        t.category,
        t.date,
        t.recurring ? 'Yes' : 'No'
    ]);

    const csvContent = [
        headers.join(','), // CSV headers
        ...rows.map(row => row.join(',')) // Join rows with comma
    ].join('\n'); // Join all lines with newline

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'expense_tracker_transactions.csv');
        link.style.visibility = 'hidden'; // Hide the link
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert('Transaction history exported to CSV!', 'success');
    } else {
        showAlert('Your browser does not support downloading files directly.', 'error');
    }
}

// --- UI Initialization and Event Listeners ---

/**
 * Populates the category select dropdowns.
 */
function populateCategoryDropdowns() {
    const historyCategoryFilterHTML = ['<option value="">All Categories</option>'];
    const transactionCategorySelectHTML = ['<option value="">Select Category</option>'];

    categories.forEach(cat => {
        historyCategoryFilterHTML.push(`<option value="${cat}">${cat}</option>`);
        transactionCategorySelectHTML.push(`<option value="${cat}">${cat}</option>`);
    });

    historyCategoryFilter.innerHTML = historyCategoryFilterHTML.join('');
    transactionCategorySelect.innerHTML = transactionCategorySelectHTML.join('');
}

/**
 * Switches the active view (Dashboard, History, Reports).
 * @param {string} viewId - The ID of the view to show (e.g., 'dashboard-view').
 */
function showView(viewId) {
    views.forEach(view => view.classList.add('hidden')); // Hide all views
    document.getElementById(viewId).classList.remove('hidden'); // Show the selected view

    // Update active navigation button styling
    navButtons.forEach(button => button.classList.remove('active-nav-button'));
    document.getElementById(`nav-${viewId.replace('-view', '')}`).classList.add('active-nav-button');

    // Re-render charts if navigating to a view that contains them
    if (viewId === 'dashboard-view' || viewId === 'reports-view') {
        updateCharts();
    }
    if (viewId === 'history-view') {
        renderTransactionTable(filterTransactions());
    }
}

/**
 * Renders all relevant UI components after data changes.
 */
function renderAllUI() {
    renderDashboardSummary();
    renderRecentTransactions();
    // Ensure the correct filtered view is shown if on history page
    if (!historyView.classList.contains('hidden')) {
        renderTransactionTable(filterTransactions());
    }
    updateCharts(); // Update all charts
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode(); // Set initial dark mode state
    transactions = loadTransactions(); // Load existing transactions
    populateCategoryDropdowns(); // Populate category dropdowns

    renderAllUI(); // Initial render of all UI components
    showView('dashboard-view'); // Show dashboard by default

    // Header/Navigation Listeners
    darkModeToggle.addEventListener('click', toggleDarkMode);
    navDashboardBtn.addEventListener('click', () => showView('dashboard-view'));
    navHistoryBtn.addEventListener('click', () => showView('history-view'));
    navReportsBtn.addEventListener('click', () => showView('reports-view'));

    // Add Transaction Button on Dashboard
    addTransactionButton.addEventListener('click', () => showModal());

    // Transaction Modal Listeners
    cancelTransactionButton.addEventListener('click', hideModal);
    transactionModal.addEventListener('click', (e) => {
        if (e.target === transactionModal) { // Close when clicking outside form
            hideModal();
        }
    });

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission

        // Collect form data
        const transactionData = {
            title: transactionTitleInput.value.trim(),
            amount: parseFloat(transactionAmountInput.value),
            type: transactionTypeSelect.value,
            category: transactionCategorySelect.value,
            date: transactionDateInput.value,
            recurring: transactionRecurringCheckbox.checked
        };

        // Basic validation
        if (!transactionData.title || isNaN(transactionData.amount) || transactionData.amount <= 0 || !transactionData.category) {
            showAlert('Please fill in all fields correctly.', 'error');
            return;
        }

        if (currentEditingTransactionId) {
            updateTransaction(currentEditingTransactionId, transactionData);
            showAlert('Transaction updated successfully!', 'success');
        } else {
            addTransaction(transactionData);
            showAlert('Transaction added successfully!', 'success');
        }
        hideModal(); // Close modal after submission
    });

    // History Filters & Search Listeners
    historySearchInput.addEventListener('input', () => renderTransactionTable(filterTransactions()));
    historyCategoryFilter.addEventListener('change', () => renderTransactionTable(filterTransactions()));
    historyDateFilter.addEventListener('change', () => {
        if (historyDateFilter.value === 'custom') {
            customDateRangeDiv.classList.remove('hidden');
        } else {
            customDateRangeDiv.classList.add('hidden');
        }
        renderTransactionTable(filterTransactions());
    });
    customStartDateInput.addEventListener('change', () => renderTransactionTable(filterTransactions()));
    customEndDateInput.addEventListener('change', () => renderTransactionTable(filterTransactions()));


    // Delegate event listeners for edit and delete buttons on the history table
    transactionHistoryTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const transactionId = target.dataset.id || target.closest('button')?.dataset.id; // Get ID from button or its icon/text
        if (!transactionId) return; // Exit if no ID is found

        if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
            const transactionToEdit = transactions.find(t => t.id === transactionId);
            if (transactionToEdit) {
                showModal(transactionToEdit);
            }
        } else if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            deleteTransaction(transactionId);
        }
    });

    // Export to CSV Button
    exportCsvButton.addEventListener('click', exportToCSV);

    // Hide alert modal when OK/Cancel is clicked (handled by showAlert internally)
});
