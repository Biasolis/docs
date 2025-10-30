// /public/admin/manage-users.js (ATUALIZADO)

// 'token' e 'user' são declarados em 'admin-guard.js'
document.addEventListener('DOMContentLoaded', () => {

    // ADICIONADO: Popula o "Olá, [Usuário]"
    if (user) document.getElementById('user-welcome').textContent = `Olá, ${user.username}`;
    
    // Tabela
    const usersListBody = document.getElementById('users-list');

    // Formulário
    const userForm = document.getElementById('userForm');
    const formTitle = document.getElementById('formTitle');
    const userIdInput = document.getElementById('userId');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email'); 
    const passwordInput = document.getElementById('password');
    const roleInput = document.getElementById('role');
    const cancelButton = document.getElementById('cancelButton');
    
    // --- 1. Função para Carregar Usuários ---
    async function carregarUsuarios() {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.replace('dashboard.html'); 
                }
                throw new Error('Falha ao carregar usuários.');
            }

            const users = await response.json();
            renderizarTabela(users);

        } catch (error) {
            console.error(error.message);
            usersListBody.innerHTML = `<tr><td colspan="5">Erro ao carregar usuários.</td></tr>`;
        }
    }

    // --- 2. Função para Renderizar Tabela ---
    function renderizarTabela(users) {
        usersListBody.innerHTML = ''; 

        if (users.length === 0) {
             usersListBody.innerHTML = `<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>`;
             return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            const isSelf = (u.id === user.id);
            const disabled = isSelf ? 'disabled' : '';

            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td> 
                <td>${u.role === 'admin' ? 'Admin' : 'Usuário'}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${u.id}" data-username="${u.username}" data-email="${u.email}" data-role="${u.role}">Editar</button>
                    <button class="btn-danger-outline" data-id="${u.id}" ${disabled}>Apagar</button>
                </td>
            `;
            usersListBody.appendChild(tr);
        });
    }

    // --- 3. Event Listener do Formulário (Salvar) ---
    userForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = userIdInput.value;
        const isEditing = !!id;

        const userData = {
            username: usernameInput.value,
            email: emailInput.value, 
            role: roleInput.value,
            password: passwordInput.value
        };

        if (isEditing && !userData.password) {
            delete userData.password;
        }

        const apiUrl = isEditing ? `/api/users/${id}` : '/api/users';
        const apiMethod = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao salvar usuário.');
            }

            alert('Usuário salvo com sucesso!');
            resetarFormulario();
            carregarUsuarios();

        } catch (error) {
            alert(error.message);
        }
    });

    // --- 4. Event Listeners da Tabela (Editar/Apagar) ---
    usersListBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = target.dataset.id;

        // --- Ação de Editar ---
        if (target.classList.contains('btn-edit')) {
            formTitle.textContent = 'Editar Usuário';
            userIdInput.value = id;
            usernameInput.value = target.dataset.username;
            emailInput.value = target.dataset.email; 
            roleInput.value = target.dataset.role;
            passwordInput.value = '';
            passwordInput.placeholder = 'Deixe em branco para manter a senha';
            cancelButton.style.display = 'inline-block';
            window.scrollTo(0, 0); 
        }

        // --- Ação de Apagar ---
        if (target.classList.contains('btn-danger-outline')) {
            if (confirm(`Tem certeza que deseja apagar o usuário ${id}?`)) {
                try {
                    const response = await fetch(`/api/users/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.message || 'Falha ao apagar.');
                    }
                    
                    carregarUsuarios();

                } catch (error) {
                    alert(error.message);
                }
            }
        }
    });

    // --- 5. Ações dos Botões do Formulário ---
    function resetarFormulario() {
        formTitle.textContent = 'Adicionar Novo Usuário';
        userForm.reset(); 
        userIdInput.value = '';
        emailInput.value = ''; 
        passwordInput.placeholder = '';
        cancelButton.style.display = 'none';
    }

    cancelButton.addEventListener('click', resetarFormulario);

    // --- 6. Carrega tudo ao iniciar ---
    carregarUsuarios();
});