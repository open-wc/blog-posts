export class MyClass {
  #privateField = 'My Class with a private field';

  publicMethod() {
    document.body.innerHTML = this.#privateField;
    debugger;
  }
}
