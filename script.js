// Ensure the DOM is fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- Local Transaction Management ---
    let transactions = []; // Global array to store transactions
    let expenseCategoryChartInstance; // To store the Chart.js instance

    // Function to load transactions from localStorage
    function loadTransactions() {
        const storedTransactions = localStorage.getItem('saulGoodmanTransactions');
        if (storedTransactions) {
            transactions = JSON.parse(storedTransactions);
        } else {
            transactions = []; // Ensure it's an empty array if nothing is stored
        }
        console.log("Transactions loaded:", transactions);
    }

    // Function to save transactions to localStorage
    function saveTransactionsToLocalStorage() {
        localStorage.setItem('saulGoodmanTransactions', JSON.stringify(transactions));
        console.log("Transactions saved to localStorage.");
    }

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const lightIcon = darkModeToggle.querySelector('.light-icon');
    const darkIcon = darkModeToggle.querySelector('.dark-icon');

    // Function to set the theme (targets the html element)
    function setTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        }
    }

    // Check for saved theme preference on load or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme(true);
    } else {
        setTheme(false);
    }

    // Event listener for dark mode toggle button
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(!isDark);
        // Re-render chart to update legend color if theme changes
        if (document.getElementById('dashboard-view').classList.contains('hidden') === false) {
             renderExpenseCategoryChart();
        }
    });


    // --- Navigation ---
    const navButtons = document.querySelectorAll('.nav-button');
    const views = document.querySelectorAll('.view');

    function showView(viewId) {
        views.forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');

        navButtons.forEach(button => {
            // Remove the active-nav-button class from all buttons
            button.classList.remove('active-nav-button');
        });

        const activeButton = document.querySelector(`#nav-${viewId.replace('-view', '')}`);
        if (activeButton) {
            // Add the active-nav-button class to the clicked button
            activeButton.classList.add('active-nav-button');
        }
        // Re-render relevant view content when switching
        if (viewId === 'dashboard-view') {
            renderDashboard();
        } else if (viewId === 'history-view') {
            renderHistory();
        }
    }

    // Add event listeners for navigation buttons
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.id.replace('nav-', '') + '-view';
            showView(viewId);
        });
    });

    // Initial view
    showView('dashboard-view');


    // --- Dashboard View Rendering ---
    function renderDashboard() {
        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        const totalBalanceEl = document.getElementById('total-balance');
        const incomeLastUpdatedEl = document.getElementById('income-last-updated');
        const expensesLastUpdatedEl = document.getElementById('expenses-last-updated');
        const recentTransactionsList = document.getElementById('recent-transactions-list');
        const noRecentTransactionsEl = document.getElementById('no-recent-transactions');

        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeDates = [];
        const expenseDates = [];

        transactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += parseFloat(t.amount);
                incomeDates.push(new Date(t.date));
            } else {
                totalExpenses += parseFloat(t.amount);
                expenseDates.push(new Date(t.date));
            }
        });

        const balance = totalIncome - totalExpenses;

        totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
        totalExpensesEl.textContent = `₹${totalExpenses.toFixed(2)}`;
        totalBalanceEl.textContent = `₹${balance.toFixed(2)}`;
        // Removed dynamic Tailwind classes, now relies on CSS variables for balance color
        totalBalanceEl.style.color = ''; // Clear any previous inline style
        if (balance >= 0) {
            totalBalanceEl.style.color = 'var(--color-income)'; // Use CSS variable for income-like color
        } else {
            totalBalanceEl.style.color = 'var(--color-expense)'; // Use CSS variable for expense-like color
        }


        const latestIncomeDate = incomeDates.length ? new Date(Math.max(...incomeDates)).toLocaleDateString() : 'N/A';
        const latestExpenseDate = expenseDates.length ? new Date(Math.max(...expenseDates)).toLocaleDateString() : 'N/A';

        incomeLastUpdatedEl.textContent = latestIncomeDate;
        expensesLastUpdatedEl.textContent = latestExpenseDate;

        // Render recent transactions (last 5)
        recentTransactionsList.innerHTML = '';
        // Sort transactions by date descending to get most recent first
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sortedTransactions.slice(0, 5); // Get last 5 after sorting

        if (recent.length > 0) {
            noRecentTransactionsEl.classList.add('hidden');
            recent.forEach(t => {
                const transactionEl = document.createElement('div');
                const amountClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
                const icon = t.type === 'income' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
                const recurringTag = t.recurring ? `<span class="recurring-tag"><i class="fas fa-redo icon-margin-right"></i>Recurring</span>` : '';

                transactionEl.className = `recent-transaction-item`;
                transactionEl.innerHTML = `
                    <div>
                        <p>${icon} ${t.title} ${recurringTag}</p>
                        <p>${t.category} &bullet; ${new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <p class="amount ${amountClass}">₹${parseFloat(t.amount).toFixed(2)}</p>
                `;
                recentTransactionsList.appendChild(transactionEl);
            });
        } else {
            noRecentTransactionsEl.classList.remove('hidden');
        }

        // Render Expense Category Chart
        renderExpenseCategoryChart();
    }


    // --- Chart.js Integration (Expense Category Chart) ---
    function renderExpenseCategoryChart() {
        const ctx = document.getElementById('expenseCategoryChart').getContext('2d');

        // Destroy existing chart if it exists
        if (expenseCategoryChartInstance) {
            expenseCategoryChartInstance.destroy();
        }

        const expenseCategories = {};
        transactions.filter(t => t.type === 'expense').forEach(expense => {
            const category = expense.category || 'Uncategorized';
            expenseCategories[category] = (expenseCategories[category] || 0) + parseFloat(expense.amount);
        });

        const labels = Object.keys(expenseCategories);
        const data = Object.values(expenseCategories);

        // Define a set of appealing, distinct colors for chart segments
        const backgroundColors = [
            '#e62314',  // chili-red
            '#ea4c15',  // golden-gate-bridge
            '#ef8a17',  // tangerine
            '#059669',  // emerald-600
            '#0ea5e9',  // sky-600
            '#f19e18',  // gamboge
            '#e11d48',  // rose-600
            '#ed7517',  // safety-orange
            '#a78bfa',  // Light purple
            '#3b82f6'   // Blue
        ];
        const borderColors = [
            '#c71d10',
            '#c44012',
            '#cf7a13',
            '#047857',
            '#0284c7',
            '#d98d15',
            '#be123c',
            '#d26b13',
            '#8b5cf6',
            '#2563eb'
        ];

        expenseCategoryChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: borderColors.slice(0, labels.length),
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
                            // Get computed style for --color-text-dark which changes with dark mode
                            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-dark'),
                            font: {
                                size: 14,
                                family: 'Montserrat'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += `₹${context.parsed.toFixed(2)}`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }


    // --- History View Rendering & Filtering ---
    const historySearchInput = document.getElementById('history-search');
    const historyCategoryFilter = document.getElementById('history-category-filter');
    const historyDateFilter = document.getElementById('history-date-filter');
    const customDateRangeDiv = document.getElementById('custom-date-range');
    const customStartDateInput = document.getElementById('custom-start-date');
    const customEndDateInput = document.getElementById('custom-end-date');
    const transactionHistoryTableBody = document.getElementById('transaction-history-table-body');
    const noHistoryTransactionsEl = document.getElementById('no-history-transactions');

    // Populate categories filter
    const categories = ['Groceries', 'Utilities', 'Rent', 'Salary', 'Freelance', 'Entertainment', 'Transport', 'Food', 'Healthcare', 'Education', 'Shopping', 'Travel', 'Investment', 'Gifts', 'Legal Fees', 'Miscellaneous'];
    function populateCategoryFilter() {
        historyCategoryFilter.innerHTML = '<option value="">All Categories</option>';
        transactionModalCategorySelect.innerHTML = '<option value="">Select Category</option>'; // For modal
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            historyCategoryFilter.appendChild(option);

            const modalOption = option.cloneNode(true);
            transactionModalCategorySelect.appendChild(modalOption);
        });
    }

    function renderHistory() {
        const searchTerm = historySearchInput.value.toLowerCase();
        const selectedCategory = historyCategoryFilter.value;
        const selectedDateFilter = historyDateFilter.value;
        const customStartDate = customStartDateInput.value ? new Date(customStartDateInput.value) : null;
        const customEndDate = customEndDateInput.value ? new Date(customEndDateInput.value) : null;

        // Show/hide custom date range inputs
        if (selectedDateFilter === 'custom') {
            customDateRangeDiv.classList.remove('hidden');
        } else {
            customDateRangeDiv.classList.add('hidden');
        }

        let filteredTransactions = transactions.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm) || t.amount.toString().includes(searchTerm) || (t.category && t.category.toLowerCase().includes(searchTerm));
            const matchesCategory = selectedCategory === '' || t.category === selectedCategory;

            let matchesDate = true;
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0); // Normalize to start of day

            if (selectedDateFilter === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                matchesDate = transactionDate.getTime() === today.getTime();
            } else if (selectedDateFilter === 'this_week') {
                const now = new Date();
                const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
                firstDayOfWeek.setHours(0, 0, 0, 0);
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
                lastDayOfWeek.setHours(23, 59, 59, 999);
                matchesDate = transactionDate >= firstDayOfWeek && transactionDate <= lastDayOfWeek;
            } else if (selectedDateFilter === 'this_month') {
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                firstDayOfMonth.setHours(0, 0, 0, 0);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                lastDayOfMonth.setHours(23, 59, 59, 999);
                matchesDate = transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
            } else if (selectedDateFilter === 'custom') {
                if (customStartDate && customEndDate) {
                    customStartDate.setHours(0, 0, 0, 0);
                    customEndDate.setHours(23, 59, 59, 999);
                    matchesDate = transactionDate >= customStartDate && transactionDate <= customEndDate;
                } else {
                    matchesDate = false; // No custom range selected yet
                }
            }
            return matchesSearch && matchesCategory && matchesDate;
        });

        transactionHistoryTableBody.innerHTML = '';
        if (filteredTransactions.length > 0) {
            noHistoryTransactionsEl.classList.add('hidden');
            filteredTransactions.forEach(t => {
                const row = document.createElement('tr');
                row.className = ``; // Classes handled by CSS
                const amountClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
                const recurringText = t.recurring ? 'Yes' : 'No';

                row.innerHTML = `
                    <td class="table-body-cell">${t.title}</td>
                    <td class="table-body-cell ${amountClass}">₹${parseFloat(t.amount).toFixed(2)}</td>
                    <td class="table-body-cell">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
                    <td class="table-body-cell">${t.category}</td>
                    <td class="table-body-cell">${new Date(t.date).toLocaleDateString()}</td>
                    <td class="table-body-cell">${recurringText}</td>
                    <td class="table-body-cell table-actions-cell">
                        <button class="edit-btn" data-id="${t.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn" data-id="${t.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                `;
                transactionHistoryTableBody.appendChild(row);
            });

            // Add event listeners for edit/delete buttons after rendering
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const transactionToEdit = transactions.find(t => t.id === id);
                    if (transactionToEdit) {
                        showTransactionModal(transactionToEdit);
                    }
                });
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    showAlert('confirm', 'Are you sure you want to delete this transaction?', true, () => {
                        deleteTransaction(id);
                    });
                });
            });

        } else {
            noHistoryTransactionsEl.classList.remove('hidden');
        }
    }

    // Add event listeners for filters
    historySearchInput.addEventListener('input', renderHistory);
    historyCategoryFilter.addEventListener('change', renderHistory);
    historyDateFilter.addEventListener('change', renderHistory);
    customStartDateInput.addEventListener('change', renderHistory);
    customEndDateInput.addEventListener('change', renderHistory);


    // --- Transaction Modal Logic ---
    const transactionModal = document.getElementById('transaction-modal');
    const addTransactionButton = document.getElementById('add-transaction-button');
    const cancelTransactionButton = document.getElementById('cancel-transaction');
    const transactionForm = document.getElementById('transaction-form');
    const modalTitle = document.getElementById('modal-title');
    const transactionIdInput = document.getElementById('transaction-id');
    const transactionTitleInput = document.getElementById('transaction-title');
    const transactionAmountInput = document.getElementById('transaction-amount');
    const transactionTypeSelect = document.getElementById('transaction-type');
    const transactionModalCategorySelect = document.getElementById('transaction-category'); // Specific for modal
    const transactionDateInput = document.getElementById('transaction-date');
    const transactionRecurringCheckbox = document.getElementById('transaction-recurring');


    function showTransactionModal(transaction = null) {
        transactionForm.reset(); // Clear previous data
        transactionIdInput.value = ''; // Clear ID for new transactions
        modalTitle.textContent = 'Add New Transaction';
        transactionDateInput.valueAsDate = new Date(); // Set default date to today

        if (transaction) {
            modalTitle.textContent = 'Edit Transaction';
            transactionIdInput.value = transaction.id;
            transactionTitleInput.value = transaction.title;
            transactionAmountInput.value = parseFloat(transaction.amount);
            transactionTypeSelect.value = transaction.type;
            transactionModalCategorySelect.value = transaction.category;
            transactionDateInput.value = transaction.date; // Date input expects 'YYYY-MM-DD'
            transactionRecurringCheckbox.checked = transaction.recurring;
        }
        transactionModal.classList.remove('hidden');
        setTimeout(() => transactionModal.classList.add('opacity-100', 'scale-100'), 10); // Animate in
    }

    function hideTransactionModal() {
        transactionModal.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => transactionModal.classList.add('hidden'), 300); // Animate out then hide
    }

    addTransactionButton.addEventListener('click', () => showTransactionModal());
    cancelTransactionButton.addEventListener('click', hideTransactionModal);

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const transactionData = {
            id: transactionIdInput.value || crypto.randomUUID(), // Generate new ID if not editing
            title: transactionTitleInput.value,
            amount: parseFloat(transactionAmountInput.value),
            type: transactionTypeSelect.value,
            category: transactionModalCategorySelect.value,
            date: transactionDateInput.value, // Keep as YYYY-MM-DD string
            recurring: transactionRecurringCheckbox.checked,
            createdAt: transactionIdInput.value ? transactions.find(t => t.id === transactionIdInput.value)?.createdAt : new Date().toISOString(), // Preserve createdAt or set new
            updatedAt: new Date().toISOString()
        };

        if (!transactionData.category) {
            showAlert('error', 'Please select a category.', false);
            return;
        }

        if (transactionData.id && transactions.some(t => t.id === transactionData.id)) {
            // Update existing transaction in local array
            transactions = transactions.map(t => t.id === transactionData.id ? transactionData : t);
            showAlert('success', 'Transaction updated!', false);
        } else {
            // Add new transaction to local array
            transactions.push(transactionData);
            showAlert('success', 'Transaction added!', false);
        }
        saveTransactionsToLocalStorage(); // Save after any modification
        renderDashboard(); // Re-render dashboard to show changes
        renderHistory(); // Re-render history to show changes
        hideTransactionModal();
    });


    // --- Custom Alert/Confirmation Modal Logic ---
    const alertModal = document.getElementById('alert-modal');
    const alertIcon = document.getElementById('alert-icon');
    const alertMessage = document.getElementById('alert-message');
    const alertCancelButton = document.getElementById('alert-cancel-button');
    const alertOkButton = document.getElementById('alert-ok-button');
    let alertCallback = null; // Store the callback function for 'OK'

    function showAlert(type, message, showCancelButton, callback = null) {
        alertIcon.className = ''; // Clear existing icons
        alertMessage.textContent = message;
        alertCallback = callback; // Set the callback

        // Set icon and colors based on type
        if (type === 'success') {
            alertIcon.classList.add('fas', 'fa-check-circle');
            alertIcon.style.color = 'var(--color-income)'; // Use CSS variable
            alertOkButton.classList.remove('button-cancel'); // Ensure correct button style
            alertOkButton.classList.add('button-primary');
        } else if (type === 'error') {
            alertIcon.classList.add('fas', 'fa-times-circle');
            alertIcon.style.color = 'var(--color-danger)'; // Use CSS variable
            alertOkButton.classList.remove('button-primary'); // Ensure correct button style
            alertOkButton.classList.add('button-cancel');
        } else if (type === 'confirm') {
            alertIcon.classList.add('fas', 'fa-question-circle');
            alertIcon.style.color = 'var(--color-info)'; // Use CSS variable
            alertOkButton.classList.remove('button-cancel'); // Ensure correct button style
            alertOkButton.classList.add('button-primary');
        }

        if (showCancelButton) {
            alertCancelButton.classList.remove('hidden');
            alertOkButton.textContent = 'Confirm';
        } else {
            alertCancelButton.classList.add('hidden');
            alertOkButton.textContent = 'OK';
        }

        alertModal.classList.remove('hidden');
        setTimeout(() => alertModal.classList.add('opacity-100', 'scale-100'), 10);
    }

    function hideAlert() {
        alertModal.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => alertModal.classList.add('hidden'), 300);
        alertCallback = null; // Clear the callback
    }

    alertOkButton.addEventListener('click', () => {
        if (alertCallback) {
            alertCallback(); // Execute the callback if it exists
        }
        hideAlert();
    });

    alertCancelButton.addEventListener('click', hideAlert);

    // Close modal if clicking outside (optional, but good UX)
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            hideAlert();
        }
    });

    transactionModal.addEventListener('click', (e) => {
        if (e.target === transactionModal) {
            hideTransactionModal();
        }
    });

    // --- Transaction Deletion for Local Storage ---
    function deleteTransaction(id) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactionsToLocalStorage();
        showAlert('success', 'Transaction deleted!', false);
        renderDashboard();
        renderHistory();
    }


    // --- Initial setup calls ---
    loadTransactions(); // Load transactions on startup
    populateCategoryFilter();
    renderDashboard(); // Render dashboard with loaded data
});
