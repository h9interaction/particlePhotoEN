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
        this.isSaving = false; // 저장 중 상태 관리
        this.isDeleting = false; // 삭제 중 상태 관리
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

        const excelDownloadBtn = document.getElementById('excelDownloadBtn');
        if (excelDownloadBtn) {
            excelDownloadBtn.addEventListener('click', () => this.downloadExcel());
        }

        const excelUploadBtn = document.getElementById('excelUploadBtn');
        if (excelUploadBtn) {
            excelUploadBtn.addEventListener('click', () => this.openExcelUploadModal());
        }

        // 엑셀 업로드 관련 이벤트 리스너들
        this.bindExcelUploadEvents();
        
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
            document.querySelector('.drag-drop-content p').style.display = 'none';
            document.querySelector('.drag-drop-icon').style.display = 'none';
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
            itemCount.textContent = `(${data.length}명)`;
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
            document.querySelector('.drag-drop-content p').style.display = 'none';
            document.querySelector('.drag-drop-icon').style.display = 'none';

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
        this.isSaving = false;
        this.isDeleting = false;
        this.clearEditForm();
        this.setEditFormPlaceholders();
        this.setSaveButtonLoading(false); // 버튼 상태 초기화
        this.setDeleteButtonLoading(false, 'modal'); // 삭제 버튼 상태 초기화
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
        document.querySelector('.drag-drop-content p').style.display = 'block';
        document.querySelector('.drag-drop-icon').style.display = 'block';
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
        // 중복 저장 방지 및 삭제 중일 때 저장 방지
        if (this.isSaving || this.isDeleting) {
            return;
        }

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
            this.isSaving = true;
            this.setSaveButtonLoading(true);
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
            this.isSaving = false;
            this.setSaveButtonLoading(false);
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
        // 중복 삭제 방지 및 저장 중일 때 삭제 방지
        if (this.isDeleting || this.isSaving) {
            return;
        }

        if (this.selectedItems.size === 0) {
            this.showMessage('삭제할 항목을 선택해주세요.', 'error');
            return;
        }
        
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        
        try {
            this.isDeleting = true;
            this.setDeleteButtonLoading(true, 'selected');
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
            this.isDeleting = false;
            this.setDeleteButtonLoading(false, 'selected');
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
        document.querySelector('.drag-drop-content p').style.display = 'none';
        document.querySelector('.drag-drop-icon').style.display = 'none';
        
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
        this.isSaving = false;
        this.isDeleting = false;
        this.setSaveButtonLoading(false); // 버튼 상태 초기화
        this.setDeleteButtonLoading(false, 'modal'); // 삭제 버튼 상태 초기화
        document.getElementById('modalTitle').textContent = '항목 편집';
        document.getElementById('editModalDeleteBtn').style.display = 'inline-block';
        document.getElementById('editModal').style.display = 'flex';
    }
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editIndex = null;
        this.editSelectedFile = null;
        this.isEditMode = false;
        this.isSaving = false;
        this.isDeleting = false;
        this.currentEditingItem = null;
        this.setSaveButtonLoading(false); // 버튼 상태 초기화
        this.setDeleteButtonLoading(false, 'modal'); // 삭제 버튼 상태 초기화
        this.clearEditForm();
    }
    // handleEditImageSelect는 setupEditModalDragDrop에서 처리됨
    async saveEdit(event) {
        event.preventDefault();
        
        // 중복 저장 방지 및 삭제 중일 때 저장 방지
        if (this.isSaving || this.isDeleting) {
            return;
        }
        
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
            this.isSaving = true;
            this.setSaveButtonLoading(true);
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
            this.isSaving = false;
            this.setSaveButtonLoading(false);
            this.showLoading(false);
        }
    }
    async deleteEditItem() {
        // 중복 삭제 방지 및 저장 중일 때 삭제 방지
        if (this.isDeleting || this.isSaving) {
            return;
        }

        if (this.editIndex === null) return;
        const englishName = this.people[this.editIndex].englishName;
        
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        
        try {
            this.isDeleting = true;
            this.setDeleteButtonLoading(true, 'modal');
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
            this.isDeleting = false;
            this.setDeleteButtonLoading(false, 'modal');
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

    // 저장 버튼 상태 관리 메서드들
    setSaveButtonLoading(loading) {
        const saveButton = document.querySelector('#editModal .btn-primary');
        const deleteButton = document.getElementById('editModalDeleteBtn');
        const cancelButton = document.getElementById('editModalCancelBtn');
        
        if (loading) {
            // 저장 버튼을 로딩 상태로 변경
            saveButton.disabled = true;
            saveButton.classList.add('loading');
            saveButton.dataset.originalText = saveButton.textContent;
            saveButton.innerHTML = '<span class="loading-spinner"></span>저장 중...';
            
            // 다른 버튼들도 비활성화
            deleteButton.disabled = true;
            deleteButton.style.opacity = '0.5';
            cancelButton.disabled = true;
            cancelButton.style.opacity = '0.5';
        } else {
            // 원래 상태로 복원
            saveButton.disabled = false;
            saveButton.classList.remove('loading');
            saveButton.textContent = saveButton.dataset.originalText || '저장';
            
            // 다른 버튼들도 활성화
            deleteButton.disabled = false;
            deleteButton.style.opacity = '1';
            cancelButton.disabled = false;
            cancelButton.style.opacity = '1';
        }
    }

    // 삭제 버튼 상태 관리 메서드들
    setDeleteButtonLoading(loading, buttonType = 'modal') {
        if (buttonType === 'modal') {
            // 편집 모달의 삭제 버튼
            const deleteButton = document.getElementById('editModalDeleteBtn');
            const saveButton = document.querySelector('#editModal .btn-primary');
            const cancelButton = document.getElementById('editModalCancelBtn');
            
            if (loading) {
                deleteButton.disabled = true;
                deleteButton.classList.add('loading');
                deleteButton.dataset.originalText = deleteButton.textContent;
                deleteButton.innerHTML = '<span class="loading-spinner"></span>삭제 중...';
                
                // 다른 버튼들도 비활성화
                saveButton.disabled = true;
                saveButton.style.opacity = '0.5';
                cancelButton.disabled = true;
                cancelButton.style.opacity = '0.5';
            } else {
                deleteButton.disabled = false;
                deleteButton.classList.remove('loading');
                deleteButton.textContent = deleteButton.dataset.originalText || '삭제';
                
                // 다른 버튼들도 활성화
                saveButton.disabled = false;
                saveButton.style.opacity = '1';
                cancelButton.disabled = false;
                cancelButton.style.opacity = '1';
            }
        } else if (buttonType === 'selected') {
            // 선택된 항목 삭제 버튼
            const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
            const selectAllBtn = document.getElementById('selectAllBtn');
            
            if (loading) {
                deleteSelectedBtn.disabled = true;
                deleteSelectedBtn.classList.add('loading');
                deleteSelectedBtn.dataset.originalText = deleteSelectedBtn.textContent;
                deleteSelectedBtn.innerHTML = '<span class="loading-spinner"></span>삭제 중...';
                
                // 전체 선택 버튼도 비활성화
                selectAllBtn.disabled = true;
                selectAllBtn.style.opacity = '0.5';
            } else {
                deleteSelectedBtn.disabled = false;
                deleteSelectedBtn.classList.remove('loading');
                deleteSelectedBtn.textContent = deleteSelectedBtn.dataset.originalText || '선택 삭제';
                
                // 전체 선택 버튼도 활성화
                selectAllBtn.disabled = false;
                selectAllBtn.style.opacity = '1';
            }
        }
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

    // 엑셀 다운로드 기능
    downloadExcel() {
        try {
            // CSV 형식으로 데이터 생성 (엑셀에서 열 수 있음)
            const headers = ['한글이름', '영문이름', '조직', '직무', '직위', '이메일', '이미지파일명'];
            const csvContent = [
                headers.join(','), // 헤더 행
                ...this.people.map(person => [
                    `"${person.koreanName || ''}"`,
                    `"${person.englishName || ''}"`,
                    `"${person.organization || ''}"`,
                    `"${person.role || ''}"`,
                    `"${person.position || ''}"`,
                    `"${person.email || ''}"`,
                    `"${person.imageFile || person.englishName + '.png'}"`
                ].join(','))
            ].join('\n');

            // BOM 추가 (UTF-8 인코딩을 위해)
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });

            // 다운로드 링크 생성
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // 파일명에 현재 날짜 포함
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD 형식
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS 형식
            link.setAttribute('download', `particle_photo_data_${dateStr}_${timeStr}.csv`);
            
            // 다운로드 실행
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showMessage(`데이터가 엑셀 파일로 다운로드되었습니다. (총 ${this.people.length}개 항목)`, 'success');
        } catch (error) {
            console.error('Excel download error:', error);
            this.showMessage('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    // 엑셀 업로드 관련 이벤트 바인딩
    bindExcelUploadEvents() {
        // 업로드 방식 선택 버튼들
        const methodSelectBtns = document.querySelectorAll('.method-select-btn');
        methodSelectBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = e.target.closest('.upload-method-option').dataset.method;
                this.selectedUploadMethod = method;
                
                // 파일 input의 accept 속성 업데이트
                const fileInput = document.getElementById('excelFileInput');
                if (method === 'zip') {
                    fileInput.accept = '.zip';
                } else {
                    fileInput.accept = '.csv,.xlsx,.xls';
                }
                
                fileInput.click();
            });
        });

        // 파일 입력 변경
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // 모달 버튼들
        const uploadCancelBtn = document.getElementById('uploadCancelBtn');
        if (uploadCancelBtn) {
            uploadCancelBtn.addEventListener('click', () => this.closeExcelUploadModal());
        }

        const uploadBackBtn = document.getElementById('uploadBackBtn');
        if (uploadBackBtn) {
            uploadBackBtn.addEventListener('click', () => this.showUploadStep(1));
        }

        const startUploadBtn = document.getElementById('startUploadBtn');
        if (startUploadBtn) {
            startUploadBtn.addEventListener('click', () => this.startBulkUpload());
        }

        const uploadCloseBtn = document.getElementById('uploadCloseBtn');
        if (uploadCloseBtn) {
            uploadCloseBtn.addEventListener('click', () => this.closeExcelUploadModal());
        }

        const uploadErrorCloseBtn = document.getElementById('uploadErrorCloseBtn');
        if (uploadErrorCloseBtn) {
            uploadErrorCloseBtn.addEventListener('click', () => this.closeExcelUploadModal());
        }
    }

    // 엑셀 업로드 모달 열기
    openExcelUploadModal() {
        this.selectedCsvData = null;
        this.showUploadStep(1);
        document.getElementById('excelUploadModal').style.display = 'block';
    }

    // 엑셀 업로드 모달 닫기
    closeExcelUploadModal() {
        document.getElementById('excelUploadModal').style.display = 'none';
        document.getElementById('excelFileInput').value = '';
        this.selectedCsvData = null;
        
        // 모든 상태 초기화
        document.getElementById('uploadResults').style.display = 'none';
        document.getElementById('uploadError').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('uploadCloseBtn').style.display = 'none';
        document.getElementById('uploadErrorCloseBtn').style.display = 'none';
        
        // 진행률 초기화
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0 / 0';
    }

    // 업로드 단계 표시
    showUploadStep(step) {
        // 모든 단계 숨기기
        for (let i = 1; i <= 3; i++) {
            const stepElement = document.getElementById(`uploadStep${i}`);
            if (stepElement) {
                stepElement.style.display = 'none';
            }
        }

        // 선택된 단계 표시
        const activeStep = document.getElementById(`uploadStep${step}`);
        if (activeStep) {
            activeStep.style.display = 'block';
        }
    }

    // 파일 선택 처리
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // ZIP 파일 처리
            if (this.selectedUploadMethod === 'zip' && file.name.toLowerCase().endsWith('.zip')) {
                await this.handleZipFile(file);
                return;
            }
            
            // CSV/Excel 파일 처리
            const content = await this.readFileAsText(file);
            const csvData = this.parseCSV(content);
            
            if (!csvData || csvData.length === 0) {
                this.showMessage('파일에 데이터가 없습니다.', 'error');
                return;
            }

            // 필수 컬럼 확인
            const requiredColumns = ['한글이름', '영문이름'];
            const firstRow = csvData[0];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            
            if (missingColumns.length > 0) {
                this.showMessage(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`, 'error');
                return;
            }

            this.selectedCsvData = csvData;
            this.showPreview(csvData);
            this.showUploadStep(2);

        } catch (error) {
            console.error('파일 처리 오류:', error);
            this.showMessage('파일 처리 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }

    // 파일을 텍스트로 읽기
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('파일 읽기 실패'));
            reader.readAsText(file, 'utf-8');
        });
    }

    // CSV 파싱
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }

        return data;
    }

    // 미리보기 표시
    showPreview(csvData) {
        const previewContainer = document.getElementById('previewContainer');
        const maxPreviewRows = 5;
        const previewData = csvData.slice(0, maxPreviewRows);

        let html = `
            <p><strong>총 ${csvData.length}개 행</strong> (미리보기: ${previewData.length}개)</p>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f5f5f5; position: sticky; top: 0;">
        `;

        // 헤더
        const headers = Object.keys(previewData[0]);
        headers.forEach(header => {
            html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`;
        });

        html += `</tr></thead><tbody>`;

        // 데이터 행들
        previewData.forEach(row => {
            html += `<tr>`;
            headers.forEach(header => {
                const value = row[header] || '';
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${value}</td>`;
            });
            html += `</tr>`;
        });

        html += `</tbody></table></div>`;

        if (csvData.length > maxPreviewRows) {
            html += `<p style="font-size: 12px; color: #666; margin-top: 8px;">... 및 ${csvData.length - maxPreviewRows}개 행 더</p>`;
        }

        previewContainer.innerHTML = html;
    }

    // 벌크 업로드 시작
    async startBulkUpload() {
        if (!this.selectedCsvData) {
            this.showMessage('업로드할 데이터가 없습니다.', 'error');
            return;
        }

        const conflictMode = document.querySelector('input[name="conflictMode"]:checked').value;
        
        this.showUploadStep(3);
        
        try {
            // CSV 데이터를 다시 CSV 문자열로 변환
            const headers = Object.keys(this.selectedCsvData[0]);
            const csvContent = [
                headers.join(','),
                ...this.selectedCsvData.map(row => 
                    headers.map(header => `"${row[header] || ''}"`).join(',')
                )
            ].join('\n');

            // FormData 생성
            const formData = new FormData();
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            formData.append('csvFile', blob, 'upload.csv');
            formData.append('conflictMode', conflictMode);

            // 진행률 표시
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            progressText.textContent = '업로드 중...';
            progressFill.style.width = '50%';

            // API 호출
            const response = await fetch('/api/people/bulk-upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                // 성공
                progressFill.style.width = '100%';
                progressText.textContent = '완료';
                
                // 결과 표시
                this.showUploadResults(result.results);
                
                // 데이터 새로고침
                await this.loadPeople();
                this.renderItems();
                
                this.showMessage(result.message, 'success');
            } else {
                throw new Error(result.error || '업로드 실패');
            }

        } catch (error) {
            console.error('업로드 오류:', error);
            this.showUploadError(error.message);
        }
    }

    // 업로드 결과 표시
    showUploadResults(results) {
        const uploadResults = document.getElementById('uploadResults');
        const resultSummary = document.getElementById('resultSummary');
        const uploadCloseBtn = document.getElementById('uploadCloseBtn');

        let html = `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p><strong>업로드 완료</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>전체: ${results.total}개</li>
                    <li style="color: #27ae60;">성공: ${results.success}개</li>
                    <li style="color: #f39c12;">건너뜀: ${results.skipped}개</li>
                    <li style="color: #e74c3c;">실패: ${results.failed}개</li>
                </ul>
        `;

        if (results.errors && results.errors.length > 0) {
            html += `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #e74c3c;">오류 상세 (${results.errors.length}개)</summary>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 12px;">
            `;
            results.errors.forEach(error => {
                html += `<li>${error}</li>`;
            });
            html += `</ul></details>`;
        }

        html += `</div>`;

        resultSummary.innerHTML = html;
        uploadResults.style.display = 'block';
        uploadCloseBtn.style.display = 'block';
    }

    // 업로드 에러 표시
    showUploadError(errorMessage) {
        // 진행률 숨기기
        document.getElementById('progressContainer').style.display = 'none';
        
        // 에러 메시지 표시
        const uploadError = document.getElementById('uploadError');
        const errorMessageDiv = document.getElementById('errorMessage');
        const uploadErrorCloseBtn = document.getElementById('uploadErrorCloseBtn');
        
        errorMessageDiv.textContent = errorMessage;
        uploadError.style.display = 'block';
        uploadErrorCloseBtn.style.display = 'block';
        
        this.showMessage('업로드 중 오류가 발생했습니다: ' + errorMessage, 'error');
    }

    // ZIP 파일 처리
    async handleZipFile(file) {
        try {
            // ZIP 파일 크기 확인 (최대 50MB)
            if (file.size > 50 * 1024 * 1024) {
                this.showMessage('ZIP 파일 크기가 너무 큽니다. (최대 50MB)', 'error');
                return;
            }

            this.showMessage('ZIP 파일을 분석하고 있습니다...', 'info');
            
            // 3단계로 직접 이동 (업로드 진행)
            this.showUploadStep(3);
            
            // 세션 ID 생성
            const sessionId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // 진행률 표시 요소
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const progressTitle = document.getElementById('uploadProgressTitle');
            
            // SSE 연결 설정
            const eventSource = new EventSource(`/api/upload-progress/${sessionId}`);
            let uploadCompleted = false;
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'connected') {
                        console.log('진행 상황 스트림 연결됨:', data.sessionId);
                        return;
                    }
                    
                    // 진행 상황 업데이트
                    progressFill.style.width = `${data.progress}%`;
                    progressText.textContent = data.message;
                    
                    if (data.type === 'processing') {
                        progressTitle.textContent = 'ZIP 파일 처리 중...';
                        if (data.currentUser) {
                            progressText.textContent = `${data.message} (${data.currentUser})`;
                        }
                    } else if (data.type === 'uploading') {
                        progressTitle.textContent = '이미지 업로드 중...';
                    } else if (data.type === 'completed') {
                        progressTitle.textContent = '업로드 완료';
                        progressText.textContent = '모든 작업이 완료되었습니다.';
                        uploadCompleted = true;
                        eventSource.close();
                    } else if (data.type === 'error') {
                        progressTitle.textContent = '오류 발생';
                        progressText.textContent = data.message;
                        uploadCompleted = true;
                        eventSource.close();
                    }
                    
                } catch (e) {
                    console.error('진행 상황 파싱 오류:', e);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('SSE 연결 오류:', error);
                eventSource.close();
            };
            
            // FormData 생성
            const formData = new FormData();
            formData.append('zipFile', file);
            formData.append('conflictMode', 'skip');
            formData.append('sessionId', sessionId);
            
            // 초기 상태 설정
            progressTitle.textContent = 'ZIP 파일 업로드 중...';
            progressText.textContent = '파일 전송 중...';
            progressFill.style.width = '5%';

            // API 호출
            const response = await fetch('/api/people/bulk-upload-zip', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // SSE가 완료 상태를 받지 못한 경우 대비
            if (!uploadCompleted) {
                eventSource.close();
            }

            if (response.ok) {
                // 성공 처리
                if (!uploadCompleted) {
                    progressFill.style.width = '100%';
                    progressText.textContent = '완료';
                    progressTitle.textContent = '업로드 완료';
                }
                
                // 결과 표시
                this.showUploadResults(result.results);
                
                // 데이터 새로고침
                await this.loadPeople();
                this.renderItems();
                
                this.showMessage(result.message, 'success');
            } else {
                throw new Error(result.error || 'ZIP 업로드 실패');
            }

        } catch (error) {
            console.error('ZIP 업로드 오류:', error);
            this.showUploadError(error.message);
        }
    }
}

let adminManager;
window.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});
window.adminManager = adminManager;

 