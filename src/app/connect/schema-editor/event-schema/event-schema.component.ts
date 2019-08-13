import { Component, Input, EventEmitter, Output, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { RestService } from '../../rest.service';
import { EventSchema } from '../model/EventSchema';
import { AdapterDescription } from '../../model/connect/AdapterDescription';
import { GuessSchema } from '../model/GuessSchema';
import { NotificationLd } from '../../model/message/NotificationLd';
import { EventProperty } from '../model/EventProperty';
import { EventPropertyNested } from '../model/EventPropertyNested';
import { EventPropertyPrimitive } from '../model/EventPropertyPrimitive';
import { EventPropertyList } from '../model/EventPropertyList';
import { ITreeOptions, TreeComponent } from 'angular-tree-component';
import { DomainPropertyProbabilityList } from '../model/DomainPropertyProbabilityList';
import { UUID } from 'angular2-uuid';
import { DataTypesService } from '../data-type.service';
import { MatDialog } from '@angular/material/dialog';
import { EventPropertyComponent } from '../event-property/event-property.component';

@Component({
  selector: 'app-event-schema',
  templateUrl: './event-schema.component.html',
  styleUrls: ['./event-schema.component.css']
})
export class EventSchemaComponent implements OnChanges {

  constructor(private restService: RestService, private dataTypesService: DataTypesService, private dialog: MatDialog) { }

  @Input() adapterDescription: AdapterDescription;
  @Input() isEditable = true;
  @Input() oldEventSchema: EventSchema;
  @Input() eventSchema: EventSchema = new EventSchema();
  @Input() domainPropertyGuesses: DomainPropertyProbabilityList[] = [];

  @Output() isEditableChange = new EventEmitter<boolean>();
  @Output() adapterChange = new EventEmitter<AdapterDescription>();
  @Output() eventSchemaChange = new EventEmitter<EventSchema>();
  @Output() oldEventSchemaChange = new EventEmitter<EventSchema>();

  @ViewChild(TreeComponent) tree: TreeComponent;

  schemaGuess: GuessSchema = new GuessSchema();
  isLoading = false;
  isError = false;
  isPreviewEnabled = false;
  showErrorMessage = false;
  countSelected = 0;
  errorMessages: NotificationLd[];
  nodes: EventProperty[] = new Array<EventProperty>();
  options: ITreeOptions = {
    childrenField: 'eventProperties',
    allowDrag: () => {
      return this.isEditable;
    },
    allowDrop: (node, { parent, index }) => {
      return parent.data.eventProperties !== undefined && parent.parent !== null;
    },
    displayField: 'runTimeName',
  };


  private onUpdateData(treeComponent: TreeComponent): void {
    treeComponent.treeModel.expandAll();
  }

  public guessSchema(): void {
    this.isLoading = true;
    this.isError = false;
    this.restService.getGuessSchema(this.adapterDescription).subscribe(guessSchema => {
      this.isLoading = false;
      this.eventSchema = guessSchema.eventSchema;
      this.eventSchemaChange.emit(this.eventSchema);
      this.schemaGuess = guessSchema;

      this.oldEventSchema = this.eventSchema.copy();
      this.oldEventSchemaChange.emit(this.oldEventSchema);

      this.refreshTree();

      this.isEditable = true;
      this.isEditableChange.emit(true);
    },
      error => {
        this.errorMessages = error.notifications;
        this.isError = true;
        this.isLoading = false;
        this.eventSchema = new EventSchema();
      });

  }

  public togglePreview(): void {
    this.isPreviewEnabled = !this.isPreviewEnabled;
  }

  public openEditDialog(data): void {
    this.dialog.open(EventPropertyComponent, {
      data: {
        property: data,
        domainProbability: this.getDomainProbability(data.runTimeName)
      },
    });
  }

  private refreshTree(): void {
    this.nodes = new Array<EventProperty>();
    this.nodes.push(this.eventSchema as unknown as EventProperty);
    this.tree.treeModel.update();
  }

  private isEventPropertyPrimitive(instance: EventProperty): boolean {
    return instance instanceof EventPropertyPrimitive;
  }

  private isEventPropertyNested(instance: EventProperty): boolean {
    return instance instanceof EventPropertyNested;
  }

  private isEventPropertyList(instance: EventProperty): boolean {
    return instance instanceof EventPropertyList;
  }

  public getDomainProbability(name: string): DomainPropertyProbabilityList {
    let result: DomainPropertyProbabilityList;

    for (const entry of this.domainPropertyGuesses) {
      if (entry.runtimeName === name) {
        result = entry;
      }
    }

    return result;
  }

  public selectProperty(id: string, eventProperties: any): void {
    if (!this.isEditable) {
      return;
    }
    eventProperties = eventProperties || this.eventSchema.eventProperties;
    for (const eventProperty of eventProperties) {
      if (eventProperty.eventProperties && eventProperty.eventProperties.length > 0) {
        if (eventProperty.id === id) {
          if (eventProperty.selected) {
            eventProperty.selected = undefined;
            this.countSelected--;
            this.selectProperty('none', eventProperty.eventProperties);
          } else {
            eventProperty.selected = true;
            this.countSelected++;
            this.selectProperty('all', eventProperty.eventProperties);
          }
        } else if (id === 'all') {
          eventProperty.selected = true;
          this.countSelected++;
          this.selectProperty('all', eventProperty.eventProperties);
        } else if (id === 'none') {
          eventProperty.selected = undefined;
          this.countSelected--;
          this.selectProperty('none', eventProperty.eventProperties);
        } else {
          this.selectProperty(id, eventProperty.eventProperties);
        }
      } else {
        if (eventProperty.id === id) {
          if (eventProperty.selected) {
            eventProperty.selected = undefined;
            this.countSelected--;
          } else {
            eventProperty.selected = true;
            this.countSelected++;
          }
        } else if (id === 'all') {
          eventProperty.selected = true;
          this.countSelected++;
        } else if (id === 'none') {
          eventProperty.selected = undefined;
          this.countSelected--;
        }
      }
    }
    this.refreshTree();
  }

  public getLabel(eventProperty: EventProperty) {
    if (eventProperty.label !== undefined && eventProperty.label !== '') {
      return eventProperty.label;
    } else if (eventProperty.runTimeName !== undefined && eventProperty.runTimeName !== '') {
      return eventProperty.runTimeName;
    }
    if (this.isEventPropertyNested(eventProperty)) {
      return 'Nested Property';
    }
    if (eventProperty instanceof EventSchema) {
      return '';
    }
    return 'Property';
  }

  public removeSelectedProperties(eventProperties: any): void {
    eventProperties = eventProperties || this.eventSchema.eventProperties;
    for (let i = eventProperties.length - 1; i >= 0; --i) {
      if (eventProperties[i].eventProperties) {
        this.removeSelectedProperties(eventProperties[i].eventProperties);
      }
      if (eventProperties[i].selected) {
        eventProperties.splice(i, 1);
      }
    }
    this.countSelected = 0;
    this.refreshTree();
  }

  public addStaticValueProperty(): void {
    const eventProperty = new EventPropertyPrimitive('staticValue/' + UUID.UUID(), undefined);

    eventProperty.setRuntimeName('key_0');
    eventProperty.setRuntimeType(this.dataTypesService.getStringTypeUrl());

    this.eventSchema.eventProperties.push(eventProperty);
    this.refreshTree();
  }

  public addTimestampProperty(): void {
    const eventProperty = new EventPropertyPrimitive('timestamp/' + UUID.UUID(), undefined);

    eventProperty.setRuntimeName('timestamp');
    eventProperty.setLabel('Timestamp');
    eventProperty.setDomainProperty('http://schema.org/DateTime');
    eventProperty.setRuntimeType(this.dataTypesService.getNumberTypeUrl());

    this.eventSchema.eventProperties.push(eventProperty);
    this.refreshTree();
  }

  public addNestedProperty(eventProperty): void {
    const uuid: string = UUID.UUID();
    if (eventProperty === undefined) {
      this.eventSchema.eventProperties.push(new EventPropertyNested(uuid, undefined));
    } else {
      eventProperty.eventProperties.push(new EventPropertyNested(uuid, undefined));
    }
    this.refreshTree();
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => { this.refreshTree() }, 200);
  }
}
