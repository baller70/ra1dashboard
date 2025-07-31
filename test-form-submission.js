// Test script to run in browser console on payment-plans/new page
console.log('🧪 TESTING FORM SUBMISSION');

// Fill out form data
const parentSelect = document.querySelector('select[name="parentId"]');
const totalAmountInput = document.querySelector('input[name="totalAmount"]');
const installmentAmountInput = document.querySelector('input[name="installmentAmount"]');
const submitButton = document.querySelector('button[type="submit"]');

console.log('Form elements found:');
console.log('- Parent select:', parentSelect);
console.log('- Total amount input:', totalAmountInput);
console.log('- Installment amount input:', installmentAmountInput);
console.log('- Submit button:', submitButton);

// Fill out the form
if (parentSelect && parentSelect.options.length > 1) {
    parentSelect.value = parentSelect.options[1].value;
    parentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Selected parent:', parentSelect.options[1].text);
}

if (totalAmountInput) {
    totalAmountInput.value = '1650';
    totalAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Set total amount: 1650');
}

if (installmentAmountInput) {
    installmentAmountInput.value = '183.33';
    installmentAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Set installment amount: 183.33');
}

// Submit the form
if (submitButton) {
    console.log('🚀 CLICKING SUBMIT BUTTON...');
    submitButton.click();
} else {
    console.log('❌ Submit button not found');
}
