// 관리자 페이지 메인 JavaScript

class AdminManager {
    constructor() {
        this.people = [];
        this.selectedItems = new Set();
        this.selectedFile = null;
        this.editIndex = null;
        this.editImageFile = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadPeople();
        this.renderItems();
        this.showMessage('관리자 페이지가 로드되었습니다.', 'info');
        this.applyGridCount();
    }

    bindEvents() {
        const gridCountSelect = document.getElementById('gridCountSelect');
        if (gridCountSelect) {
            gridCountSelect.addEventListener('change', () => this.applyGridCount());
        }
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('addBtn').addEventListener('click', () => this.addItem());
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('selectAllBtn').addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('imageUpload').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('dragDropArea').addEventListener('click', () => document.getElementById('imageUpload').click());
        document.getElementById('dragDropArea').addEventListener('dragover', (e) => this.handleDragOver(e));
        document.getElementById('dragDropArea').addEventListener('drop', (e) => this.handleDrop(e));
        document.getElementById('editModalCancelBtn').addEventListener('click', () => this.closeEditModal());
        document.getElementById('editForm').addEventListener('submit', (e) => this.saveEdit(e));
        document.getElementById('editImageUpload').addEventListener('change', (e) => this.handleEditImageSelect(e));
        document.getElementById('editModalDeleteBtn').addEventListener('click', () => this.deleteEditItem());
    }

    async loadPeople() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/people');
            if (response.ok) {
                this.people = await response.json();
            } else {
                throw new Error('서버에서 데이터를 가져올 수 없습니다.');
            }
        } catch (error) {
            this.people = [];
            this.showMessage('데이터 로드 실패: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshData() {
        await this.loadPeople();
        this.renderItems();
        this.showMessage('데이터가 새로고침되었습니다.', 'success');
    }

    renderItems(filtered = null) {
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';
        const data = filtered || this.people;
        data.forEach((person) => {
            const item = this.createItemCard(person);
            container.appendChild(item);
        });
        this.applyGridCount();
        const itemCount = document.getElementById('itemCount');
        if (itemCount) {
            itemCount.textContent = `(${data.length}개)`;
        }
    }

    createItemCard(person) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.englishName = person.englishName;
        const imagePath = person.imageUrl || `images/${person.imageFile || person.englishName + '.png'}?v=${Date.now()}`;
        card.innerHTML = `
            <div class="item-header">
                <input type="checkbox" class="item-checkbox" data-english-name="${person.englishName}">
            </div>
            <img src="${imagePath}" alt="${person.koreanName}" class="item-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4='">
            <div class="item-info">
                <div class="item-name">${person.koreanName}</div>
                <div class="item-filename">${person.englishName}.png</div>
                <div class="item-meta">
                  <span>${person.organization || ''}</span>
                  <span>${person.position || ''}</span>
                  <span>${person.role || ''}</span>
                  <span>${person.email || ''}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('item-checkbox')) return;
            this.editItemByEnglishName(person.englishName);
        });
        const checkbox = card.querySelector('.item-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedItems.add(person.englishName);
                card.classList.add('selected');
            } else {
                this.selectedItems.delete(person.englishName);
                card.classList.remove('selected');
            }
        });
        return card;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }
    processImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showMessage('이미지 파일만 업로드 가능합니다.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dragDropArea = document.getElementById('dragDropArea');
            dragDropArea.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 4px;">`;
        };
        reader.readAsDataURL(file);
        this.selectedFile = file;
    }
    clearForm() {
        document.getElementById('koreanName').value = '';
        document.getElementById('englishName').value = '';
        document.getElementById('organization').value = '';
        document.getElementById('role').value = '';
        document.getElementById('position').value = '';
        document.getElementById('email').value = '';
        document.getElementById('imageUpload').value = '';
        document.getElementById('dragDropArea').innerHTML = '<p>이미지를 드래그하거나 클릭하여 선택하세요</p>';
        this.selectedFile = null;
    }
    async addItem() {
        const koreanName = document.getElementById('koreanName').value.trim();
        const englishName = document.getElementById('englishName').value.trim();
        const organization = document.getElementById('organization').value.trim();
        const role = document.getElementById('role').value.trim();
        const position = document.getElementById('position').value.trim();
        const email = document.getElementById('email').value.trim();
        if (!koreanName || !englishName || !this.selectedFile) {
            this.showMessage('모든 필드를 입력하고 이미지를 선택해주세요.', 'error');
            return;
        }
        if (this.people.some(p => p.englishName === englishName)) {
            this.showMessage('이미 존재하는 영문 이름입니다.', 'error');
            return;
        }
        try {
            this.showLoading(true);
            const formData = new FormData();
            formData.append('koreanName', koreanName);
            formData.append('englishName', englishName);
            formData.append('organization', organization);
            formData.append('role', role);
            formData.append('position', position);
            formData.append('email', email);
            formData.append('image', this.selectedFile);
            const response = await fetch('/api/people', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                this.showMessage(result.message, 'success');
                await this.loadPeople();
                this.renderItems();
                this.clearForm();
            } else {
                const error = await response.json();
                throw new Error(error.error || '서버 오류가 발생했습니다.');
            }
        } catch (error) {
            this.showMessage('항목 추가에 실패했습니다: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const filtered = this.people.filter(person => {
            return (
                person.koreanName.toLowerCase().includes(searchTerm) ||
                person.englishName.toLowerCase().includes(searchTerm) ||
                (person.organization || '').toLowerCase().includes(searchTerm) ||
                (person.role || '').toLowerCase().includes(searchTerm) ||
                (person.position || '').toLowerCase().includes(searchTerm) ||
                (person.email || '').toLowerCase().includes(searchTerm)
            );
        });
        this.renderItems(filtered);
    }
    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (this.selectedItems.size === checkboxes.length) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                this.selectedItems.delete(checkbox.dataset.englishName);
                checkbox.closest('.item-card').classList.remove('selected');
            });
            selectAllBtn.textContent = '전체 선택';
        } else {
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                this.selectedItems.add(checkbox.dataset.englishName);
                checkbox.closest('.item-card').classList.add('selected');
            });
            selectAllBtn.textContent = '전체 해제';
        }
    }
    async deleteSelected() {
        if (this.selectedItems.size === 0) {
            this.showMessage('삭제할 항목을 선택해주세요.', 'error');
            return;
        }
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try {
            this.showLoading(true);
            const sortedEnglishNames = Array.from(this.selectedItems).sort((a, b) => b.localeCompare(a));
            for (const englishName of sortedEnglishNames) {
                const response = await fetch(`/api/people/${englishName}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '삭제 실패');
                }
            }
            await this.loadPeople();
            this.renderItems();
            this.selectedItems.clear();
            this.showMessage('선택된 항목이 삭제되었습니다.', 'success');
        } catch (error) {
            this.showMessage('삭제에 실패했습니다: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    editItemByEnglishName(englishName) {
        const index = this.people.findIndex(p => p.englishName === englishName);
        if (index === -1) return;
        this.editIndex = index;
        const person = this.people[index];
        document.getElementById('editImagePreview').src = person.imageUrl || `images/${person.imageFile || person.englishName + '.png'}?v=${Date.now()}`;
        document.getElementById('editKoreanName').value = person.koreanName;
        document.getElementById('editEnglishName').value = person.englishName;
        document.getElementById('editOrganization').value = person.organization || '';
        document.getElementById('editRole').value = person.role || '';
        document.getElementById('editPosition').value = person.position || '';
        document.getElementById('editEmail').value = person.email || '';
        this.editImageFile = null;
        document.getElementById('editModal').style.display = 'block';
    }
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editIndex = null;
        this.editImageFile = null;
    }
    handleEditImageSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.editImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('editImagePreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    async saveEdit(event) {
        event.preventDefault();
        if (this.editIndex === null) return;
        const oldPerson = this.people[this.editIndex];
        const koreanName = document.getElementById('editKoreanName').value.trim();
        const newEnglishName = document.getElementById('editEnglishName').value.trim();
        const organization = document.getElementById('editOrganization').value.trim();
        const role = document.getElementById('editRole').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        if (!koreanName || !newEnglishName) {
            this.showMessage('이름을 모두 입력하세요.', 'error');
            return;
        }
        try {
            this.showLoading(true);
            const formData = new FormData();
            formData.append('koreanName', koreanName);
            formData.append('newEnglishName', newEnglishName);
            formData.append('organization', organization);
            formData.append('role', role);
            formData.append('position', position);
            formData.append('email', email);
            if (this.editImageFile) {
                formData.append('image', this.editImageFile);
            }
            const response = await fetch(`/api/people/${oldPerson.englishName}`, {
                method: 'PATCH',
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                this.showMessage(result.message, 'success');
                await this.loadPeople();
                this.renderItems();
                this.closeEditModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || '서버 오류가 발생했습니다.');
            }
        } catch (error) {
            this.showMessage('편집에 실패했습니다: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    async deleteEditItem() {
        if (this.editIndex === null) return;
        const englishName = this.people[this.editIndex].englishName;
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try {
            this.showLoading(true);
            const response = await fetch(`/api/people/${englishName}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                this.showMessage('항목이 삭제되었습니다.', 'success');
                await this.loadPeople();
                this.renderItems();
                this.closeEditModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || '서버 오류가 발생했습니다.');
            }
        } catch (error) {
            this.showMessage('삭제에 실패했습니다: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    applyGridCount() {
        const gridCountSelect = document.getElementById('gridCountSelect');
        const itemsContainer = document.getElementById('itemsContainer');
        if (gridCountSelect && itemsContainer) {
            const count = parseInt(gridCountSelect.value, 10) || 4;
            itemsContainer.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
        }
    }
    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }
    showMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 토스트 메시지 생성
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // 토스트를 컨테이너에 추가
        toastContainer.appendChild(toast);
        
        // 애니메이션을 위해 약간의 지연 후 show 클래스 추가
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 2초 후 토스트 제거
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300); // 애니메이션 완료 후 DOM에서 제거
        }, 2000);
    }
}

let adminManager;
window.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});
window.adminManager = adminManager; 