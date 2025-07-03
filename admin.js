// 관리자 페이지 메인 JavaScript

class AdminManager {
    constructor() {
        this.people = [];
        this.selectedItems = new Set();
        this.selectedFile = null;
        this.editIndex = null;
        this.editImageFile = null;
        this.cropper = null;
        this.editingContext = null; // 'add' 또는 'edit'
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
        // 기존 요소들에 대한 조건부 이벤트 리스너
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('selectAllBtn').addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
        // 기존 dragDropArea는 제거되었으므로 이벤트 리스너 제거
        document.getElementById('editModalCancelBtn').addEventListener('click', () => this.closeEditModal());
        document.getElementById('editForm').addEventListener('submit', (e) => this.saveEdit(e));
        // 이미지 관련 이벤트는 setupEditModalDragDrop에서 처리됨
        document.getElementById('editModalDeleteBtn').addEventListener('click', () => this.deleteEditItem());

        // previewImage 요소는 더 이상 존재하지 않음

        // 새항목 추가 버튼 이벤트
        document.getElementById('addNewItemBtn').addEventListener('click', () => this.openAddModal());
        
        // 이미지 편집 모달 이벤트
        document.getElementById('editorSaveBtn').addEventListener('click', () => this.saveEditedImage());
        document.getElementById('editorCancelBtn').addEventListener('click', () => this.closeImageEditor());
        document.getElementById('brightness').addEventListener('input', () => this.applyImageFilters());
        document.getElementById('contrast').addEventListener('input', () => this.applyImageFilters());
        
        // 편집 모달 드래그 앤 드롭 이벤트
        this.setupEditModalDragDrop();
    }
    
    // 편집 모달 드래그 앤 드롭 설정
    setupEditModalDragDrop() {
        const editDragDropArea = document.getElementById('editDragDropArea');
        const editImageUpload = document.getElementById('editImageUpload');
        const editImagePreview = document.getElementById('editImagePreview');
        const changeImageBtn = document.getElementById('changeImageBtn');
        
        // 드래그 앤 드롭 이벤트
        editDragDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            editDragDropArea.classList.add('drag-over');
        });
        
        editDragDropArea.addEventListener('dragleave', () => {
            editDragDropArea.classList.remove('drag-over');
        });
        
        editDragDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            editDragDropArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleEditImageFile(files[0]);
            }
        });
        
        // 클릭으로 파일 선택 (미리보기 이미지가 아닌 경우에만)
        editDragDropArea.addEventListener('click', (e) => {
            if (e.target !== editImagePreview) {
                editImageUpload.click();
            }
        });
        
        changeImageBtn.addEventListener('click', () => {
            editImageUpload.click();
        });
        
        editImageUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleEditImageFile(e.target.files[0]);
            }
        });
        
        // 미리보기 이미지 클릭 시 이미지 편집 (이벤트 버블링 방지)
        editImagePreview.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 버블링 방지
            if (this.editSelectedFile) {
                this.openImageEditor(this.editSelectedFile);
            } else if (editImagePreview.src) {
                // editSelectedFile이 없으면 현재 미리보기 이미지 사용
                this.openImageEditor(editImagePreview.src);
            }
        });
    }
    
    // 편집 모달 이미지 파일 처리
    handleEditImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showMessage('이미지 파일만 업로드할 수 있습니다.', 'error');
            return;
        }
        
        this.editSelectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const editImagePreview = document.getElementById('editImagePreview');
            editImagePreview.src = e.target.result;
            editImagePreview.style.display = 'block';
            document.getElementById('editDragDropArea').querySelector('p').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    
    // 기존 이미지를 File 객체로 변환
    async loadExistingImageAsFile(imageSrc) {
        try {
            const response = await fetch(imageSrc);
            const blob = await response.blob();
            const filename = imageSrc.split('/').pop() || 'image.png';
            this.editSelectedFile = new File([blob], filename, { type: blob.type });
        } catch (error) {
            console.warn('기존 이미지 로드 실패:', error);
            this.editSelectedFile = null;
        }
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
                <img src="${imagePath}" alt="${person.koreanName}" class="item-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4='">
                <input type="checkbox" class="item-checkbox" data-english-name="${person.englishName}">
            </div>
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

    // 이제 편집 모달에서 통합 처리됨

    // reEditImage 메서드는 편집 모달의 이미지 클릭으로 대체됨

    processImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showMessage('이미지 파일만 업로드 가능합니다.', 'error');
            return;
        }
        
        // 편집 모달용 파일 처리로 통합
        this.handleEditImageFile(file);
    }

    openImageEditor(imageSrc) {
        const modal = document.getElementById('imageEditorModal');
        const image = document.getElementById('imageToCrop');
        
        let src = imageSrc;
        if (this.editSelectedFile) {
            src = URL.createObjectURL(this.editSelectedFile);
        }
        image.src = src;

        modal.style.display = 'block';

        image.onload = () => {
            if (this.cropper) {
                this.cropper.destroy();
            }
            this.cropper = new Cropper(image, {
                aspectRatio: 4 / 3,
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                ready: () => {
                    this.applyImageFilters();
                }
            });
        };
    }

    applyImageFilters() {
        const brightness = document.getElementById('brightness').value;
        const contrast = document.getElementById('contrast').value;
        const filterValue = `grayscale(100%) brightness(${brightness}%) contrast(${contrast}%)`;
        
        // 전체 이미지에 필터 적용
        const image = document.querySelector('.cropper-canvas img');
        if (image) {
            image.style.filter = filterValue;
        }
        
        // 크롭박스 내부 이미지에도 필터 적용
        const cropBoxImage = document.querySelector('.cropper-crop-box img');
        if (cropBoxImage) {
            cropBoxImage.style.filter = filterValue;
        }
        
        // Cropper 컨테이너 전체에 필터 적용
        const cropperContainer = document.querySelector('.cropper-container');
        if (cropperContainer) {
            cropperContainer.style.filter = filterValue;
        }
    }

    closeImageEditor() {
        document.getElementById('imageEditorModal').style.display = 'none';
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        document.getElementById('imageUpload').value = ''; // 파일 선택 초기화
    }

    saveEditedImage() {
        if (!this.cropper) return;

        const canvas = this.cropper.getCroppedCanvas({ width: 400, height: 300 });
        const ctx = canvas.getContext('2d');
        const brightness = document.getElementById('brightness').value;
        const contrast = document.getElementById('contrast').value;

        ctx.filter = `grayscale(100%) brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.drawImage(canvas, 0, 0, 400, 300);

        canvas.toBlob((blob) => {
            const editedFile = new File([blob], "edited_image.png", { type: "image/png" });

            // 편집된 이미지를 편집 모달에 설정
            this.editSelectedFile = editedFile;
            const editImagePreview = document.getElementById('editImagePreview');
            editImagePreview.src = URL.createObjectURL(this.editSelectedFile);
            editImagePreview.style.display = 'block';
            document.getElementById('editDragDropArea').querySelector('p').style.display = 'none';

            this.closeImageEditor();
        }, 'image/png');
    }
    clearForm() {
        // 이 메서드는 더 이상 사용되지 않음 (편집 모달로 통합됨)
        // clearEditForm()을 대신 사용
        this.clearEditForm();
    }
    // 새항목 추가 모달 열기
    openAddModal() {
        this.isEditMode = false;
        this.currentEditingItem = null;
        this.clearEditForm();
        this.setEditFormPlaceholders();
        document.getElementById('modalTitle').textContent = '새항목 추가';
        document.getElementById('editModalDeleteBtn').style.display = 'none';
        document.getElementById('editModal').style.display = 'flex';
    }
    
    // 편집 폼 초기화
    clearEditForm() {
        document.getElementById('editKoreanName').value = '';
        document.getElementById('editEnglishName').value = '';
        document.getElementById('editOrganization').value = '';
        document.getElementById('editRole').value = '';
        document.getElementById('editPosition').value = '';
        document.getElementById('editEmail').value = '';
        
        const previewImage = document.getElementById('editImagePreview');
        previewImage.style.display = 'none';
        previewImage.src = '';
        document.getElementById('editDragDropArea').querySelector('p').style.display = 'block';
        this.editSelectedFile = null;
    }
    
    // 플레이스홀더 설정
    setEditFormPlaceholders() {
        document.getElementById('editKoreanName').placeholder = '한글 이름을 입력하세요';
        document.getElementById('editEnglishName').placeholder = '영문 이름을 입력하세요 ex) HongGilDong';
        document.getElementById('editOrganization').placeholder = '조직명을 입력하세요';
        document.getElementById('editRole').placeholder = '직무를 입력하세요';
        document.getElementById('editPosition').placeholder = '직위를 입력하세요';
        document.getElementById('editEmail').placeholder = '이메일을 입력하세요';
    }

    async addItem() {
        const koreanName = document.getElementById('editKoreanName').value.trim();
        const englishName = document.getElementById('editEnglishName').value.trim();
        const organization = document.getElementById('editOrganization').value.trim();
        const role = document.getElementById('editRole').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        if (!koreanName || !englishName || !this.editSelectedFile) {
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
            formData.append('image', this.editSelectedFile);
            const response = await fetch('/api/people', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                this.showMessage(result.message, 'success');
                await this.loadPeople();
                this.renderItems();
                this.clearEditForm();
                document.getElementById('editModal').style.display = 'none';
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
        
        this.isEditMode = true;
        this.currentEditingItem = this.people[index];
        this.editIndex = index;
        
        const person = this.people[index];
        
        // 이미지 설정
        const editImagePreview = document.getElementById('editImagePreview');
        const imageSrc = person.imageUrl || `images/${person.imageFile || person.englishName + '.png'}?v=${Date.now()}`;
        editImagePreview.src = imageSrc;
        editImagePreview.style.display = 'block';
        document.getElementById('editDragDropArea').querySelector('p').style.display = 'none';
        
        // 기존 이미지를 File 객체로 변환하여 편집 가능하도록 설정
        this.loadExistingImageAsFile(imageSrc);
        
        // 폼 데이터 설정
        document.getElementById('editKoreanName').value = person.koreanName;
        document.getElementById('editEnglishName').value = person.englishName;
        document.getElementById('editOrganization').value = person.organization || '';
        document.getElementById('editRole').value = person.role || '';
        document.getElementById('editPosition').value = person.position || '';
        document.getElementById('editEmail').value = person.email || '';
        
        // 플레이스홀더 제거
        document.getElementById('editKoreanName').placeholder = '';
        document.getElementById('editEnglishName').placeholder = '';
        document.getElementById('editOrganization').placeholder = '';
        document.getElementById('editRole').placeholder = '';
        document.getElementById('editPosition').placeholder = '';
        document.getElementById('editEmail').placeholder = '';
        
        this.editSelectedFile = null;
        document.getElementById('modalTitle').textContent = '항목 편집';
        document.getElementById('editModalDeleteBtn').style.display = 'inline-block';
        document.getElementById('editModal').style.display = 'flex';
    }
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editIndex = null;
        this.editSelectedFile = null;
        this.isEditMode = false;
        this.currentEditingItem = null;
        this.clearEditForm();
    }
    // handleEditImageSelect는 setupEditModalDragDrop에서 처리됨
    async saveEdit(event) {
        event.preventDefault();
        
        const koreanName = document.getElementById('editKoreanName').value.trim();
        const englishName = document.getElementById('editEnglishName').value.trim();
        const organization = document.getElementById('editOrganization').value.trim();
        const role = document.getElementById('editRole').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        
        if (!koreanName || !englishName) {
            this.showMessage('이름을 모두 입력하세요.', 'error');
            return;
        }
        
        // 새항목 추가 모드인 경우
        if (!this.isEditMode) {
            await this.addItem();
            return;
        }
        
        // 편집 모드인 경우
        if (this.editIndex === null) return;
        const oldPerson = this.people[this.editIndex];
        
        try {
            this.showLoading(true);
            const formData = new FormData();
            formData.append('koreanName', koreanName);
            formData.append('newEnglishName', englishName);
            formData.append('organization', organization);
            formData.append('role', role);
            formData.append('position', position);
            formData.append('email', email);
            if (this.editSelectedFile) {
                formData.append('image', this.editSelectedFile);
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

 