export class MyClass {
  constructor() {
    this.message = 'MyClass loaded and instantiated';
  }

  publicMethod() {
    document.body.innerHTML = this.message;
    debugger;
  }
}
