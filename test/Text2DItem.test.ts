import { describe, it, expect } from 'vitest';
import { Text2DItem } from '../src/items/Text2DItem';

describe('Text2DItem', () => {
  it('creates with defaults and inserts into container', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c);
    expect(c.children.length).toBe(1);
    expect(t.visible).toBe(true);
  });

  it('creates with custom options', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c, { text: 'hi', pos: [10, 20], color: 'red', fontSize: 24, fontFamily: 'Arial' });
    expect(c.children.length).toBe(1);
    expect((c.firstChild as HTMLElement).textContent).toBe('hi');
  });

  it('setText / setPosition / setColor / setFontSize', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c);
    t.setText('xyz');
    t.setPosition(50, 60);
    t.setColor('blue');
    t.setFontSize(30);
    expect((c.firstChild as HTMLElement).textContent).toBe('xyz');
  });

  it('show/hide toggles visibility', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c);
    t.hide();
    expect(t.visible).toBe(false);
    expect((c.firstChild as HTMLElement).style.display).toBe('none');
    t.show();
    expect(t.visible).toBe(true);
  });

  it('dispose removes element', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c);
    t.dispose();
    expect(c.children.length).toBe(0);
  });

  it('anchor top-right uses right/top CSS', () => {
    const c = document.createElement('div');
    new Text2DItem(c, { anchor: 'top-right', pos: [12, 16] });
    const el = c.firstChild as HTMLElement;
    expect(el.style.right).toBe('12px');
    expect(el.style.top).toBe('16px');
    expect(el.style.left).toBe('');
  });

  it('anchor bottom-left uses left/bottom CSS', () => {
    const c = document.createElement('div');
    new Text2DItem(c, { anchor: 'bottom-left', pos: [5, 8] });
    const el = c.firstChild as HTMLElement;
    expect(el.style.left).toBe('5px');
    expect(el.style.bottom).toBe('8px');
  });

  it('anchor bottom-right uses right/bottom CSS', () => {
    const c = document.createElement('div');
    new Text2DItem(c, { anchor: 'bottom-right', pos: [1, 2] });
    const el = c.firstChild as HTMLElement;
    expect(el.style.right).toBe('1px');
    expect(el.style.bottom).toBe('2px');
  });

  it('background + padding options applied', () => {
    const c = document.createElement('div');
    new Text2DItem(c, { background: 'rgba(0,0,0,0.5)', padding: '10px' });
    const el = c.firstChild as HTMLElement;
    expect(el.style.background).toContain('rgba');
    expect(el.style.padding).toBe('10px');
  });

  it('setHTML sets innerHTML', () => {
    const c = document.createElement('div');
    const t = new Text2DItem(c);
    t.setHTML('<b>bold</b>');
    expect((c.firstChild as HTMLElement).innerHTML).toBe('<b>bold</b>');
  });
});
