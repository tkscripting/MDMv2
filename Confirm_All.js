(function () {
    'use strict';

    // Function to select and check all checkboxes
    function selectAndCheckAllCheckboxesConfirmAll() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.click();
            }
        });
    }

    // Click the confirm button after checking all boxes
    function clickConfirmButtonAfterCheckboxes() {
        const confirmButton = document.querySelector('.MuiButtonBase-root.MuiButton-root.MuiButton-contained.MuiButton-containedPrimary.MuiButton-sizeSmall.MuiButton-containedSizeSmall.MuiButton-colorPrimary.css-nlb5uj');
        if (confirmButton) {
            confirmButton.click();
        }
    }

    // Add a "Confirm All" button inside the .MuiBox-root.css-ni3ac element
    function addButtonInsideMuiBox() {
        const parentElement = document.querySelector('.MuiBox-root.css-mlggcq');
        if (parentElement) {
            const element = parentElement.querySelector('.MuiBox-root.css-ni3ac');
            if (element && !element.querySelector('.tampermonkey-btn')) {
                const button = document.createElement('button');
                button.textContent = 'Confirm All';
                button.classList.add('tampermonkey-btn');
                Object.assign(button.style, {
                    padding: '6px 16px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    lineHeight: '1.75',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    boxShadow: 'none',
                    height: '29px',
                    minWidth: '120px',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                });

                button.addEventListener('click', () => {
                    selectAndCheckAllCheckboxesConfirmAll();
                    clickConfirmButtonAfterCheckboxes();
                });

                element.appendChild(button);
            }
        }
    }

    // MutationObserver to dynamically add the button when DOM changes
    const observer = new MutationObserver(() => {
        addButtonInsideMuiBox();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial button insertion
    addButtonInsideMuiBox();

})();
